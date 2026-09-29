import { Router } from 'express';
import { StockController } from './stock.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const stockController = new StockController();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /stock:
 *   get:
 *     summary: Get user stock
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', stockController.getStock);

/**
 * @swagger
 * /stock:
 *   post:
 *     summary: Add stock
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  requireRole('DISTRIBUTOR', 'PENGECER'),
  stockController.addStock
);

/**
 * @swagger
 * /stock/:userId/:pupukId:
 *   patch:
 *     summary: Update stock (adjustment)
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:userId/:pupukId',
  requireRole('DISTRIBUTOR'),
  stockController.updateStock
);

/**
 * @swagger
 * /stock/history:
 *   get:
 *     summary: Get stock history
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', stockController.getStockHistory);

export default router;
