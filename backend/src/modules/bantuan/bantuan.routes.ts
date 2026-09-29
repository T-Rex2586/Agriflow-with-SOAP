import { Router } from 'express';
import { BantuanController } from './bantuan.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const bantuanController = new BantuanController();

/**
 * @swagger
 * /bantuan:
 *   post:
 *     summary: Submit help/support request
 *     tags: [Bantuan]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - email
 *               - topik
 *               - ringkasan
 *             properties:
 *               firstName:
 *                 type: string
 *               middleName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               topik:
 *                 type: string
 *               ringkasan:
 *                 type: string
 */
router.post('/', bantuanController.submitBantuan);

/**
 * @swagger
 * /bantuan/my:
 *   get:
 *     summary: Get my help requests
 *     tags: [Bantuan]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', authenticate, bantuanController.getMyBantuan);

export default router;
