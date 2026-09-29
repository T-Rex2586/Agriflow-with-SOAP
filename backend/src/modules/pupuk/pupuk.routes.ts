import { Router } from 'express';
import { PupukController } from './pupuk.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const controller = new PupukController();

router.use(authenticate);
router.use(requireRole('DISTRIBUTOR'));

router.get('/', controller.getAllPupuk.bind(controller));
router.post('/', controller.createPupuk.bind(controller));

export default router;
