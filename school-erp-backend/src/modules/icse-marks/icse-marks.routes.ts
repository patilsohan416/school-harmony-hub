import { Router } from 'express';
import { getRoster, saveMarks, getSubjectWiseResults, getGradeWiseResults, getProgressReport, getPreliminaryProgress, getStudentDashboard, getConsolidatedResults } from './icse-marks.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/icse-marks/roster?classId=&sectionId=&examName=&academicYear=&subjects=Subj1|Subj2
router.get('/roster', getRoster);

// POST /api/icse-marks/save  { classId, sectionId, examName, academicYear, subjects: [{name, maxMarks}], records: [{studentId, subjectName, marks}] }
router.post('/save', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), saveMarks);

// GET /api/icse-marks/subject-wise-results?examName=&academicYear=
router.get('/subject-wise-results', getSubjectWiseResults);

// GET /api/icse-marks/grade-wise-results?examName=&academicYear=&classId=&sectionId=
router.get('/grade-wise-results', getGradeWiseResults);

// GET /api/icse-marks/progress-report?studentId=&examName=&academicYear=
router.get('/progress-report', getProgressReport);

// GET /api/icse-marks/preliminary-progress?examName=&academicYear=&classId=&sectionId=
router.get('/preliminary-progress', getPreliminaryProgress);

// GET /api/icse-marks/dashboard/:studentId?academicYear=
router.get('/dashboard/:studentId', getStudentDashboard);

// GET /api/icse-marks/consolidated-results?classId=&sectionId=&examName=&academicYear=
router.get('/consolidated-results', getConsolidatedResults);

export { router as icseMarksRoutes };