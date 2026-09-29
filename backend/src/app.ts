import express, { Application } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler, AppError } from './common/middleware/error.middleware';
import { apiRateLimiter } from './common/middleware/rate-limit.middleware';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import landingRoutes from './modules/landing/landing.routes';
import bantuanRoutes from './modules/bantuan/bantuan.routes';

// Import module routes
import distributorRoutes from './modules/distributor/distributor.routes';
import pengecerRoutes from './modules/pengecer/pengecer.routes';
import pemerintahRoutes from './modules/pemerintah/pemerintah.routes';

// Import additional module routes
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import monitoringRoutes from './modules/monitoring/monitoring.routes';
import notificationRoutes from './modules/notification/notification.routes';
import petaniRoutes from './modules/petani/petani.routes';
import redemptionRoutes from './modules/redemption/redemption.routes';
import shipmentRoutes from './modules/shipment/shipment.routes';
import stockRoutes from './modules/stock/stock.routes';
import pupukRoutes from './modules/pupuk/pupuk.routes';

import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import { config } from './config/env';
import { verifyAccessToken } from './utils/jwt';
import redisClient from './config/redis';
import prisma from './config/database';

const app: Application = express();

// Security hardening
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration: Allow all origins and custom SOAP headers
app.use(
  cors({
    origin: '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'SOAPAction', 'X-Requested-With', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Secure authenticated uploads endpoint (ISO 27001 / UU PDP compliance)
app.get('/uploads/:filename', async (req, res, next) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ error: 'Akses ditolak: Autentikasi diperlukan untuk melihat dokumen' });
      return;
    }

    try {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        res.status(401).json({ error: 'Token telah dicabut' });
        return;
      }
    } catch {
      // Proceed if redis cache is temporarily unavailable
    }

    let decoded: any;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      res.status(401).json({ error: 'Token tidak valid atau telah kadaluarsa' });
      return;
    }

    const safeFilename = path.basename(req.params.filename);
    const userRole = (decoded.role || '').toUpperCase();

    if (userRole !== 'PEMERINTAH' && userRole !== 'ADMIN') {
      const isOwner = await prisma.user.findFirst({
        where: {
          UserId: Number(decoded.userId),
          RegistrationProof: { contains: safeFilename },
        },
      });
      if (!isOwner) {
        res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki wewenang untuk dokumen ini' });
        return;
      }
    }

    const uploadDir = path.resolve(config.upload.dir);
    const filePath = path.join(uploadDir, safeFilename);

    if (!filePath.startsWith(uploadDir) || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Dokumen tidak ditemukan' });
      return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'AgriFlow 2 Backend (Hybrid REST & SOAP) is running',
    soapEndpoint: '/soap/agriflow',
    wsdl: '/soap/agriflow?wsdl',
  });
});

// Global rate limiting for standard API routes (bypass SOAP if needed)
app.use('/api', apiRateLimiter);

// REST API Routes (Semua operasi standar tetap menggunakan RESTful API)
app.use('/api/auth', authRoutes);
app.use('/api/landing', landingRoutes);
app.use('/api/bantuan', bantuanRoutes);
app.use('/api/distributor', distributorRoutes);
app.use('/api/pengecer', pengecerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/petani', petaniRoutes);
app.use('/api/redemption', redemptionRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/pupuk', pupukRoutes);

// Route Pemerintah via REST (tetap di-mount sebagai fallback/bridge)
app.use('/api/pemerintah', pemerintahRoutes);

export default app;
