import { Router } from 'express';
import { getRoster, saveMarks, getProgressReport, getHighSchoolResults, getPrimaryResults, getSubjectWiseResults } from './cbse-marks.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/cbse-marks/roster?classId=&sectionId=&examName=&academicYear=&subjects=Subj1|Subj2
router.get('/roster', getRoster);

// POST /api/cbse-marks/save  { classId, sectionId, examName, academicYear, subjects: [{name, maxMarks}], records: [{studentId, subjectName, marks}] }
router.post('/save', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), saveMarks);

// GET /api/cbse-marks/progress-report?studentId=&examName=&academicYear=
router.get('/progress-report', getProgressReport);

// GET /api/cbse-marks/high-school-results?examName=&academicYear=&classId=&sectionId=
router.get('/high-school-results', getHighSchoolResults);

// GET /api/cbse-marks/primary-results?examName=&academicYear=&classId=&sectionId=
router.get('/primary-results', getPrimaryResults);

// GET /api/cbse-marks/subject-wise-results?examName=&academicYear=
router.get('/subject-wise-results', getSubjectWiseResults);

export { router as cbseMarksRoutes };