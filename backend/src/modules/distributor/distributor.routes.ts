import { Router } from 'express';
import { DistributorController } from './distributor.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const controller = new DistributorController();

// All routes require authentication and Distributor role
router.use(authenticate);
router.use(requireRole('DISTRIBUTOR'));

// Dashboard
router.get('/dashboard', controller.getDashboard.bind(controller));

// Shipments
router.post('/shipments', controller.createShipment.bind(controller));
router.post('/pengiriman', controller.createShipment.bind(controller));
router.get('/shipments/recent', controller.getRecentShipments.bind(controller));
router.get('/shipments/history', controller.getShipmentHistory.bind(controller));
router.get('/pengiriman/history', controller.getShipmentHistory.bind(controller));
router.get('/validate-pengecer/:pengecerId', controller.validatePengecer.bind(controller));
router.get('/validasi-pengecer/:pengecerId', controller.validatePengecer.bind(controller));
router.get('/pengecer/search', controller.searchPengecer.bind(controller));

// Stock Management
router.get('/stock', controller.getStockDashboard.bind(controller));
router.get('/stok', controller.getStockDashboard.bind(controller));
router.get('/stock/:pupukId', controller.getCurrentStock.bind(controller));
router.get('/stok/:pupukId', controller.getCurrentStock.bind(controller));
router.post('/stock/adjust', controller.adjustStock.bind(controller));
router.post('/stok/adjust', controller.adjustStock.bind(controller));
router.post('/stock/add', controller.addStock.bind(controller));
router.post('/stok/add', controller.addStock.bind(controller));
router.get('/stock/history/incoming', controller.getIncomingStockHistory.bind(controller));
router.get('/stok/history/masuk', controller.getIncomingStockHistory.bind(controller));
router.get('/stock/history/outgoing', controller.getOutgoingStockHistory.bind(controller));
router.get('/stok/history/keluar', controller.getOutgoingStockHistory.bind(controller));

// Notifications
router.get('/notifications', controller.getNotifications.bind(controller));
router.get('/notifikasi', controller.getNotifications.bind(controller));
router.patch('/notifications/:notifikasiId/read', controller.markNotificationRead.bind(controller));
router.patch('/notifikasi/:notifikasiId/baca', controller.markNotificationRead.bind(controller));

export default router;
