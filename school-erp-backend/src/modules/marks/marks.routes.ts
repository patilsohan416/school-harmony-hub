import { Router } from 'express';
import {
  getRoster, saveMarks, getProgressReport, getConsolidatedResults,
  getSubjectWiseResults, getGradeWiseResults, getGrade5And8Results,
} from './marks.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/marks/roster?classId=&sectionId=&examName=&academicYear=&subjects=Subj1|Subj2
// Staff-only: shows the whole class roster for marks entry.
router.get('/roster', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getRoster);

// POST /api/marks/save  { classId, sectionId, examName, academicYear, subjects: [{name, maxMarks}], records: [{studentId, subjectName, marks}] }
router.post('/save', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), saveMarks);

// GET /api/marks/progress-report?studentId=&examName=&academicYear=
// Staff-only. This takes an arbitrary studentId — without a role check
// any logged-in student could change that id in the URL and view another
// student's report. Students see their OWN results only via the separate
// GET /students/me/results endpoint, which ignores any studentId in the
// request and always scopes to req.user.id server-side.
router.get('/progress-report', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getProgressReport);

// GET /api/marks/consolidated-results?classId=&sectionId=&examName=&academicYear=
// Staff-only: whole-class pass/fail breakdown, not a single student's view.
router.get('/consolidated-results', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getConsolidatedResults);

// GET /api/marks/subject-wise-results?examName=&academicYear=
// Staff-only: cross-student subject averages/rankings.
router.get('/subject-wise-results', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getSubjectWiseResults);

// GET /api/marks/grade-wise-results?classId=&sectionId=&examName=&academicYear=
// Staff-only: whole-class grade distribution.
router.get('/grade-wise-results', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getGradeWiseResults);

// GET /api/marks/grade-5-8-results?examName=&academicYear=
// Staff-only: cross-class results listing.
router.get('/grade-5-8-results', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getGrade5And8Results);

export { router as marksRoutes };