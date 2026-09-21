import { Response, NextFunction } from 'express';
import { TimetableService } from './timetable.service';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../lib/prisma';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const classes = await TimetableService.getClasses(req.user?.tenantId || DEFAULT_TENANT_ID);
    res.json({ success: true, data: classes });
  } catch (error) {
    console.error('❌ Error in getClasses (timetable):', error);
    next(error);
  }
};

export const getSubjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subjects = await TimetableService.getSubjects(req.user?.tenantId || DEFAULT_TENANT_ID);
    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('❌ Error in getSubjects (timetable):', error);
    next(error);
  }
};

export const getTeachers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teachers = await TimetableService.getTeachers(req.user?.tenantId || DEFAULT_TENANT_ID);
    res.json({ success: true, data: teachers });
  } catch (error) {
    console.error('❌ Error in getTeachers (timetable):', error);
    next(error);
  }
};

export const getGrid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, sectionId } = req.params;
    const entries = await TimetableService.getGrid(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      classId,
      sectionId
    );
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('❌ Error in getGrid:', error);
    next(error);
  }
};

export const saveGrid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, sectionId, entries } = req.body;
    const saved = await TimetableService.saveGrid(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      classId,
      sectionId,
      entries || []
    );
    res.json({ success: true, message: 'Timetable saved successfully', data: saved });
  } catch (error) {
    console.error('❌ Error in saveGrid:', error);
    next(error);
  }
};

export const deleteEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await TimetableService.deleteEntry(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.params.id
    );
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('❌ Error in deleteEntry:', error);
    next(error);
  }
};

// ✅ Create a subject on the fly (called from the Timetable Builder's
// "Create …" option when a teacher types a subject that doesn't exist yet)
export const ensureSubject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const subject = await TimetableService.ensureSubject(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      name
    );
    res.json({ success: true, data: subject });
  } catch (error) {
    console.error('❌ Error in ensureSubject:', error);
    next(error);
  }
};

// ✅ Teacher Dashboard — "My Timetable"
// Self-scoped: finds the staff record for the logged-in user and returns
// only that teacher's own periods. Read-only by design.
export const getMySchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const staff = await prisma.staff.findFirst({
      where: { tenantId, userId: req.user?.id },
    });
    if (!staff) {
      res.json({
        success: true,
        data: [],
        message: 'No staff profile is linked to this account yet.',
      });
      return;
    }
    const schedule = await TimetableService.getMySchedule(tenantId, staff.id);
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('❌ Error in getMySchedule:', error);
    next(error);
  }
};

// ✅ Student Dashboard — "My Timetable"
// Self-scoped AND class/section-scoped: the classId and sectionId come
// from the STUDENT record in the database (matched by the logged-in
// user's id), never from the request. A student cannot pass their own
// classId/sectionId as query params or URL segments to peek at another
// class's timetable — those are simply ignored.
export const getMyStudentSchedule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // 1. Resolve the logged-in user to their student record
    const student = await prisma.student.findFirst({
      where: { tenantId, userId },
      select: {
        id: true,
        classId: true,
        sectionId: true,
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });

    if (!student) {
      res.json({
        success: true,
        data: [],
        meta: null,
        message: 'No student profile is linked to this account yet.',
      });
      return;
    }

    if (!student.classId || !student.sectionId) {
      res.json({
        success: true,
        data: [],
        meta: null,
        message: 'You are not assigned to a class or section yet.',
      });
      return;
    }

    // 2. Fetch ONLY this student's class + section timetable
    const schedule = await TimetableService.getStudentSchedule(
      tenantId,
      student.classId,
      student.sectionId
    );

    // 3. Include meta so the frontend can show "Class X · Section Y"
    res.json({
      success: true,
      data: schedule,
      meta: {
        classId: student.classId,
        className: student.class?.name ?? '',
        sectionId: student.sectionId,
        sectionName: student.section?.name ?? '',
        totalPeriods: schedule.length,
      },
    });
  } catch (error) {
    console.error('❌ Error in getMyStudentSchedule:', error);
    next(error);
  }
};