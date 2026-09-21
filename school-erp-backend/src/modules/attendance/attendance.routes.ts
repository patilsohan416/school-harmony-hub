import { Router } from 'express';
import {
  getRoster, markAttendance,
  listRegister, getRegisterEntry, updateRegisterEntry, deleteRegisterEntry, createRegisterEntryBlocked,
} from './attendance.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/attendance/roster?classId=&sectionId=&date=
// Staff-only: this returns the whole class/section roster with everyone's
// attendance status for a date — a student calling this could see every
// classmate's attendance, not just their own. Students get their own
// attendance via GET /students/me/dashboard instead.
router.get('/roster', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getRoster);

// POST /api/attendance/mark  { classId, sectionId, date, records: [{studentId, status, remarks?}] }
router.post('/mark', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), markAttendance);

// Attendance Register — history view of everything already marked.
// Staff-only for the same reason as /roster: it's a cross-student list/
// lookup, not scoped to "my own records".
router.get('/register', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), listRegister);
router.post('/register', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), createRegisterEntryBlocked);
router.get('/register/:id', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getRegisterEntry);
router.put('/register/:id', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), updateRegisterEntry);
router.delete('/register/:id', authorize(['PRINCIPAL', 'ADMIN']), deleteRegisterEntry);

export { router as attendanceRoutes };