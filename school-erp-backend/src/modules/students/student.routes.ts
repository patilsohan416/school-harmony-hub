import { Router, Request, Response, NextFunction } from 'express';
import {
  getStudents,
  getStudent,
  getStudentByAdmissionNo,
  getStudentByRollNumber,
  getNextRollNumber,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStatistics,
  getMyDashboard,
  getMyResults,
} from './student.controller';

import { authenticate, authorize } from '../../middleware/auth';
import { uploadStudentPhoto } from '../../middleware/upload';

const router = Router();

function handlePhotoUpload(req: Request, res: Response, next: NextFunction) {
  uploadStudentPhoto(req, res, (err: any) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Photo must be 2 MB or smaller'
          : err.message || 'Invalid photo upload';
      res.status(400).json({ success: false, message });
      return;
    }
    next();
  });
}

router.use(authenticate);

// Must come before '/:id' or Express will treat "me" as an id param.
router.get('/me/dashboard', getMyDashboard);
router.get('/me/results', getMyResults);

// Statistics and lookup routes (specific routes first)
router.get('/statistics', authorize(['PRINCIPAL', 'ADMIN']), getStudentStatistics);
router.get('/lookup/:admissionNo', getStudentByAdmissionNo);
router.get('/roll-lookup', getStudentByRollNumber);
router.get('/next-roll-number', getNextRollNumber);

// Main CRUD routes
router.get('/', authorize(['PRINCIPAL', 'ADMIN', 'TEACHER']), getStudents);
router.get('/:id', getStudent);
router.post('/', authorize(['PRINCIPAL', 'ADMIN']), handlePhotoUpload, createStudent);
router.put('/:id', authorize(['PRINCIPAL', 'ADMIN']), handlePhotoUpload, updateStudent);
router.delete('/:id', authorize(['PRINCIPAL', 'ADMIN']), deleteStudent);

export { router as studentRoutes };