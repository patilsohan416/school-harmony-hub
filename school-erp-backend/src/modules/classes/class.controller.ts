import { Response, NextFunction } from 'express';
import { ClassService } from './class.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getClasses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const classes = await ClassService.getClassesWithSections(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};
