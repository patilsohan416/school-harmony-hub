import { Response, NextFunction } from 'express';
import { StudyMaterialService } from './study-material.service';
import { CreateStudyMaterialSchema } from './study-material.validation';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const listStudyMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, sectionId, subjectId } = req.query as {
      classId?: string;
      sectionId?: string;
      subjectId?: string;
    };
    const materials = await StudyMaterialService.list(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      { classId, sectionId, subjectId }
    );
    res.json({ success: true, data: materials });
  } catch (error) {
    console.error('❌ Error in listStudyMaterial:', error);
    next(error);
  }
};

export const createStudyMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError(400, 'A file is required');
    }

    const parsed = CreateStudyMaterialSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message || 'Invalid input');
    }

    const material = await StudyMaterialService.create(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.user?.id,
      parsed.data,
      {
        fileName: file.originalname,
        fileUrl: `/uploads/study-material/${file.filename}`,
      }
    );

    res.status(201).json({ success: true, message: 'Study material uploaded', data: material });
  } catch (error) {
    console.error('❌ Error in createStudyMaterial:', error);
    next(error);
  }
};

export const deleteStudyMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await StudyMaterialService.delete(req.user?.tenantId || DEFAULT_TENANT_ID, req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('❌ Error in deleteStudyMaterial:', error);
    next(error);
  }
};