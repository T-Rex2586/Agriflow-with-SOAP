import { Router } from 'express';
import { PengecerController } from './pengecer.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const controller = new PengecerController();

// All routes require authentication and Pengecer role
router.use(authenticate);
router.use(requireRole('PENGECER'));

// Dashboard
router.get('/dashboard', controller.getDashboard.bind(controller));

// Receipts (Receiving from Distributor)
router.get('/receipts/recent', controller.getRecentReceipts.bind(controller));
router.get('/penerimaan/recent', controller.getRecentReceipts.bind(controller));
router.get('/receipts/history', controller.getReceiptHistory.bind(controller));
router.get('/penerimaan/history', controller.getReceiptHistory.bind(controller));
router.get('/validate-shipment/:kirimanId', controller.validateShipment.bind(controller));
router.get('/validasi-kiriman/:kirimanId', controller.validateShipment.bind(controller));
router.get('/kiriman/search', controller.searchKiriman.bind(controller));
router.post('/receipts', controller.receiveShipment.bind(controller));
router.post('/terima-stok', controller.receiveShipment.bind(controller));

// Stock Management
router.get('/stock', controller.getStockDashboard.bind(controller));
router.get('/stok', controller.getStockDashboard.bind(controller));
router.post('/stock/add', controller.addStock.bind(controller));
router.post('/stok/add', controller.addStock.bind(controller));

// Redemptions (Distribution to Farmers)
router.get('/redemptions/history', controller.getRedemptionHistory.bind(controller));
router.get('/penebusan/history', controller.getRedemptionHistory.bind(controller));
router.get('/validate-petani/:petaniId', controller.validatePetani.bind(controller));
router.get('/validasi-petani/:petaniId', controller.validatePetani.bind(controller));
router.post('/redemptions', controller.createRedemption.bind(controller));
router.post('/penebusan', controller.createRedemption.bind(controller));

// Notifications
router.get('/notifications', controller.getNotifications.bind(controller));
router.get('/notifikasi', controller.getNotifications.bind(controller));
router.patch('/notifications/:notifikasiId/read', controller.markNotificationRead.bind(controller));
router.patch('/notifikasi/:notifikasiId/baca', controller.markNotificationRead.bind(controller));

export default router;
