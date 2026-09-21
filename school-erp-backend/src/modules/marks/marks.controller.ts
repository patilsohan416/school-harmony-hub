import { Response, NextFunction } from 'express';
import { MarksService } from './marks.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, sectionId, examName, academicYear, subjects } = req.query as {
      classId?: string;
      sectionId?: string;
      examName?: string;
      academicYear?: string;
      subjects?: string;
    };

    const result = await MarksService.getRoster({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      classId: classId || '',
      sectionId: sectionId || '',
      examName: examName || '',
      academicYear: academicYear || '',
      subjects: subjects ? subjects.split('|') : [],
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const saveMarks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, sectionId, examName, academicYear, subjects, records } = req.body as {
      classId: string;
      sectionId: string;
      examName: string;
      academicYear: string;
      subjects: { name: string; maxMarks: number }[];
      records: { studentId: string; subjectName: string; marks: number }[];
    };

    const result = await MarksService.saveMarks({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      classId,
      sectionId,
      examName,
      academicYear,
      markedBy: req.user?.id,
      subjects,
      records,
    });

    res.json({ success: true, message: 'Marks saved successfully', data: result });
  } catch (error) {
    next(error);
  }
};

export const getProgressReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { studentId, examName, academicYear } = req.query as {
      studentId?: string;
      examName?: string;
      academicYear?: string;
    };

    const result = await MarksService.getProgressReport({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      studentId: studentId || '',
      examName: examName || '',
      academicYear: academicYear || '',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getConsolidatedResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, sectionId, examName, academicYear } = req.query as {
      classId?: string;
      sectionId?: string;
      examName?: string;
      academicYear?: string;
    };

    const result = await MarksService.getConsolidatedResults({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      classId: classId || '',
      sectionId: sectionId || '',
      examName: examName || '',
      academicYear: academicYear || '',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getSubjectWiseResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { examName, academicYear } = req.query as { examName?: string; academicYear?: string };

    const result = await MarksService.getSubjectWiseResults({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      examName: examName || '',
      academicYear: academicYear || '',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getGradeWiseResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, sectionId, examName, academicYear } = req.query as {
      classId?: string;
      sectionId?: string;
      examName?: string;
      academicYear?: string;
    };

    const result = await MarksService.getGradeWiseResults({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      classId: classId || '',
      sectionId: sectionId || '',
      examName: examName || '',
      academicYear: academicYear || '',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getGrade5And8Results = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { examName, academicYear } = req.query as { examName?: string; academicYear?: string };

    const result = await MarksService.getGrade5And8Results({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      examName: examName || '',
      academicYear: academicYear || '',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};