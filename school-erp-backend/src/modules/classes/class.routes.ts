import { Router } from 'express';
import { getClasses } from './class.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getClasses);

export { router as classRoutes };
