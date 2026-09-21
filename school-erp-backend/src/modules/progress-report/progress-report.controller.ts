import { Response, NextFunction } from 'express';
import { ProgressReportService } from './progress-report.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getProgressReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query as { academicYear?: string };

    const report = await ProgressReportService.getForStudent(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      studentId,
      academicYear || ''
    );

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};