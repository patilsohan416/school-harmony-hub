import { Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, sectionId, date } = req.query as {
      classId?: string;
      sectionId?: string;
      date?: string;
    };

    const roster = await AttendanceService.getRoster({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      classId: classId || '',
      sectionId: sectionId || '',
      date: date || new Date().toISOString().slice(0, 10),
    });

    res.json({ success: true, data: roster });
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, sectionId, date, records } = req.body as {
      classId: string;
      sectionId: string;
      date: string;
      records: { studentId: string; status: string; remarks?: string }[];
    };

    const result = await AttendanceService.markAttendance({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      classId,
      sectionId,
      date,
      markedBy: req.user?.id,
      records,
    });

    res.json({
      success: true,
      message: 'Attendance saved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listRegister = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = '1', limit = '10', search, sortBy, sortOrder, classId, sectionId, date, status } = req.query as Record<string, string>;

    const result = await AttendanceService.listRegister({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      search,
      sortBy,
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
      classId,
      sectionId,
      date,
      status,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getRegisterEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AttendanceService.getRegisterEntry(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.params.id
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateRegisterEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await AttendanceService.updateRegisterEntry(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.params.id,
      req.body
    );
    const data = await AttendanceService.getRegisterEntry(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.params.id
    );
    res.json({ success: true, message: 'Attendance updated', data });
  } catch (error) {
    next(error);
  }
};

export const deleteRegisterEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await AttendanceService.deleteRegisterEntry(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.params.id
    );
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    next(error);
  }
};

export const createRegisterEntryBlocked = async (
  _req: AuthRequest,
  res: Response
) => {
  res.status(400).json({
    success: false,
    message: 'Add attendance from the Mark Attendance page — it needs an actual student, class, and section selected, not typed text.',
  });
};