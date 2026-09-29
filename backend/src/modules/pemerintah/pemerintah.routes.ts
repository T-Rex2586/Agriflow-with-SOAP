import { Router } from 'express';
import { PemerintahController } from './pemerintah.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const controller = new PemerintahController();

// All routes require authentication and Pemerintah role
router.use(authenticate);
router.use(requireRole('PEMERINTAH'));

// Dashboard & Analytics
router.get('/dashboard', controller.getDashboard.bind(controller));
router.get('/notifications/top', controller.getTopNotifications.bind(controller));
router.get('/anomalies', controller.getAnomalies.bind(controller));

// User Management
router.get('/users/list', controller.getUsersByStatus.bind(controller));
router.get('/users/pending', controller.getPendingUsers.bind(controller));
router.post('/users/:userId/approve', controller.approveUser.bind(controller));
router.post('/users/:userId/reject', controller.rejectUser.bind(controller));
router.patch('/users/:userId/edit', controller.editUser.bind(controller));
router.post('/users/:userId/reset-password', controller.resetPassword.bind(controller));
router.post('/users/:userId/toggle-status', controller.toggleUserStatus.bind(controller));

// Stock Time Series
router.get('/stock-time-series', controller.getStockTimeSeries.bind(controller));

// Nonaktifkan Candidates
router.get('/users/nonaktifkan-candidates', controller.getNonaktifkanCandidates.bind(controller));

// Help Requests
router.get('/help-requests', controller.getHelpRequests.bind(controller));

export default router;
