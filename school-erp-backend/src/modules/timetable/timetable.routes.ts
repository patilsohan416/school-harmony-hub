import { Router } from 'express';
import {
  getClasses,
  getSubjects,
  getTeachers,
  getGrid,
  saveGrid,
  deleteEntry,
  ensureSubject,
  getMySchedule,
  getMyStudentSchedule,
} from './timetable.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ─────────────────────────────────────────────────────────────────
// Lookup data for dropdowns — used by the Timetable Builder (staff only)
// ─────────────────────────────────────────────────────────────────
router.get('/classes', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getClasses);
router.get('/subjects', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getSubjects);
router.get('/teachers', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getTeachers);
router.post('/subjects', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), ensureSubject);

// ─────────────────────────────────────────────────────────────────
// Grid read — staff only. Students use /my-student-schedule below,
// which is scoped to their own class/section and can't be pointed
// at anyone else's.
// ─────────────────────────────────────────────────────────────────
router.get(
  '/grid/:classId/:sectionId',
  authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']),
  getGrid
);

// ─────────────────────────────────────────────────────────────────
// Writes — explicitly excludes STUDENT. This is the real enforcement
// point: no URL guessing or DevTools poking can save/delete a
// timetable entry unless the role is one of these.
// ─────────────────────────────────────────────────────────────────
router.post('/grid', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), saveGrid);
router.delete('/:id', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), deleteEntry);

// ─────────────────────────────────────────────────────────────────
// Teacher Dashboard — read-only, self-scoped
// ─────────────────────────────────────────────────────────────────
router.get('/my-schedule', getMySchedule);

// ─────────────────────────────────────────────────────────────────
// Student Dashboard — read-only, self-scoped to calling student's
// own class/section. Any authenticated user may call this, but the
// controller ignores query/URL params and uses the DB record.
// ─────────────────────────────────────────────────────────────────
router.get('/my-student-schedule', getMyStudentSchedule);

export { router as timetableRoutes };