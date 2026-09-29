import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const notificationController = new NotificationController();

router.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 */
router.get('/', notificationController.getNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /notifications/:id/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @swagger
 * /notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/mark-all-read', notificationController.markAllAsRead);

/**
 * @swagger
 * /notifications/:id:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * @swagger
 * /notifications/complaints:
 *   post:
 *     summary: Submit complaint/help request
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 */
router.post('/complaints', notificationController.submitComplaint);

/**
 * @swagger
 * /notifications/complaints:
 *   get:
 *     summary: Get all complaints (Government only)
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/complaints',
  requireRole('PEMERINTAH'),
  notificationController.getComplaints
);

/**
 * @swagger
 * /notifications/complaints/:id:
 *   get:
 *     summary: Get complaint by ID (Government only)
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/complaints/:id',
  requireRole('PEMERINTAH'),
  notificationController.getComplaintById
);

export default router;
