import { Router } from 'express';
import { getProgressReport } from './progress-report.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/progress-report/:studentId?academicYear=2026-27
router.get('/:studentId', getProgressReport);

export { router as progressReportRoutes };