import { Router } from 'express';
import { ShipmentController } from './shipment.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const shipmentController = new ShipmentController();

router.use(authenticate);

/**
 * @swagger
 * /shipments:
 *   post:
 *     summary: Create shipment (Distributor only)
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  requireRole('DISTRIBUTOR'),
  shipmentController.createShipment
);

/**
 * @swagger
 * /shipments/history:
 *   get:
 *     summary: Get shipment history
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', shipmentController.getShipmentHistory);

/**
 * @swagger
 * /shipments/receive:
 *   post:
 *     summary: Receive shipment (Retailer only)
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/receive',
  requireRole('PENGECER'),
  shipmentController.receiveShipment
);

export default router;
