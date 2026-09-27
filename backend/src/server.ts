import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import * as soap from 'soap';
import { config } from './config/env';
import { agriflowSoapService } from './soap-service';
import { extractWsSecurityHeader } from './services/ws-security';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));

// Mount REST Compatibility Bridge (sehingga frontend Vercel dapat berkomunikasi langsung ke backend SOAP)
import { restBridgeRouter } from './rest-bridge';
app.use('/api', restBridgeRouter);

// Path WSDL
const wsdlPath = path.join(__dirname, 'wsdl', 'agriflow.wsdl');
const wsdlXml = fs.readFileSync(wsdlPath, 'utf8');

// Raw WSDL XML route for easy viewing
app.get('/soap/agriflow.wsdl', (_req, res) => {
  res.header('Content-Type', 'text/xml');
  res.send(wsdlXml);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    protocol: 'SOAP 1.1',
    service: 'AgriFlow 2 Web Services',
    endpoint: `http://localhost:${config.port}/soap/agriflow`,
    wsdl: `http://localhost:${config.port}/soap/agriflow?wsdl`,
    security: 'WS-Security HMAC-SHA256 Signed SOAP (admin operations)',
  });
});

/**
 * Middleware khusus untuk endpoint SOAP:
 * Menangkap raw XML request body dan menyuntikkan WS-Security header
 * ke dalam args agar soap-service.ts dapat memvalidasinya.
 */
app.use('/soap/agriflow', (req, res, next) => {
  if (req.method !== 'POST') return next();

  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { rawBody += chunk; });
  req.on('end', () => {
    const securityHeaderXml = extractWsSecurityHeader(rawBody);
    if (securityHeaderXml) {
      // Simpan di res.locals sehingga handler SOAP bisa membacanya
      (res as any).wsSecurityHeaderXml = securityHeaderXml;
      (req as any).wsSecurityHeaderXml = securityHeaderXml;
    }
    (req as any).rawSoapBody = rawBody;
    next();
  });
});

const server = app.listen(config.port, () => {
  // Inisialisasi SOAP Listener
  soap.listen(app, '/soap/agriflow', agriflowSoapService, wsdlXml, () => {
    console.log(`\n======================================================`);
    console.log(`🌾 AgriFlow 2 - SOAP Web Service is RUNNING!`);
    console.log(`📡 SOAP Endpoint : http://localhost:${config.port}/soap/agriflow`);
    console.log(`📄 WSDL Contract : http://localhost:${config.port}/soap/agriflow?wsdl`);
    console.log(`🔐 WS-Security   : HMAC-SHA256 Signed SOAP (operasi admin PEMERINTAH)`);
    console.log(`💻 Web UI Tester : http://localhost:${config.port}/`);
    console.log(`======================================================\n`);
  });
});

export default server;
