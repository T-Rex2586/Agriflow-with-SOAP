import { Router } from 'express';
import { PetaniController } from './petani.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const petaniController = new PetaniController();

// All routes require authentication and PENGECER role
router.use(authenticate);
router.use(requireRole('PENGECER'));

/**
 * @swagger
 * /petani:
 *   get:
 *     summary: Get all farmers for logged-in retailer
 *     tags: [Petani]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 */
router.get('/', petaniController.getMyFarmers);

/**
 * @swagger
 * /petani:
 *   post:
 *     summary: Create new farmer
 *     tags: [Petani]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', petaniController.createFarmer);

/**
 * @swagger
 * /petani/{petaniId}:
 *   get:
 *     summary: Get farmer by ID
 *     tags: [Petani]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search', petaniController.searchFarmers);
router.get('/:petaniId', petaniController.getFarmerById);

/**
 * @swagger
 * /petani/{petaniId}:
 *   patch:
 *     summary: Update farmer
 *     tags: [Petani]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:petaniId', petaniController.updateFarmer);

/**
 * @swagger
 * /petani/{petaniId}:
 *   delete:
 *     summary: Delete farmer
 *     tags: [Petani]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:petaniId', petaniController.deleteFarmer);

/**
 * @swagger
 * /petani/{petaniId}/kuota:
 *   get:
 *     summary: Get farmer quota
 *     tags: [Petani]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:petaniId/kuota', petaniController.getFarmerQuota);

export default router;
