import { Router } from 'express';
import { LandingController } from './landing.controller';

const router = Router();
const landingController = new LandingController();

/**
 * @swagger
 * /landing/stats:
 *   get:
 *     summary: Get public statistics for landing page
 *     tags: [Landing]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', landingController.getStats);

/**
 * @swagger
 * /landing/about:
 *   get:
 *     summary: Get about information
 *     tags: [Landing]
 *     responses:
 *       200:
 *         description: About information retrieved successfully
 */
router.get('/about', landingController.getAbout);

/**
 * @swagger
 * /landing/fertilizers:
 *   get:
 *     summary: Get list of available fertilizers
 *     tags: [Landing]
 *     responses:
 *       200:
 *         description: Fertilizer list retrieved successfully
 */
router.get('/fertilizers', landingController.getFertilizers);

export default router;
