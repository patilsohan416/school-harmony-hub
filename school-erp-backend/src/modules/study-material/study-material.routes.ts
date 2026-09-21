import { Router, Request, Response, NextFunction } from 'express';
import {
  listStudyMaterial,
  createStudyMaterial,
  deleteStudyMaterial,
} from './study-material.controller';
import { authenticate } from '../../middleware/auth';
import { uploadStudyMaterialFile } from '../../middleware/upload';

const router = Router();

function handleFileUpload(req: Request, res: Response, next: NextFunction) {
  uploadStudyMaterialFile(req, res, (err: any) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File must be 15 MB or smaller'
          : err.message || 'Invalid file upload';
      res.status(400).json({ success: false, message });
      return;
    }
    next();
  });
}

router.use(authenticate);

router.get('/', listStudyMaterial);
router.post('/', handleFileUpload, createStudyMaterial);
router.delete('/:id', deleteStudyMaterial);

export { router as studyMaterialRoutes };