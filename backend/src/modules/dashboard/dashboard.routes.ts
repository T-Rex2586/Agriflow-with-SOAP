import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../common/middleware/auth.middleware';

const router = Router();
const dashboardController = new DashboardController();

router.use(authenticate);

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get dashboard data (role-specific)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/', dashboardController.getDashboard);

export default router;
