import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { uploadGenericAttachments } from '../../middleware/upload';
import * as GenericController from './generic.controller';

const router = Router();

// ✅ All routes require authentication
router.use(authenticate);

// Wraps multer so file-validation errors (bad type / too large) come back
// as a clean JSON 400 instead of crashing the request. Multer only
// actually parses the body when Content-Type is multipart/form-data, so
// this is a no-op for plain JSON requests from modules without file fields.
function handleAttachments(req: Request, res: Response, next: NextFunction) {
  uploadGenericAttachments(req, res, (err: any) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File must be 5 MB or smaller'
          : err.message || 'Invalid file upload';
      res.status(400).json({ success: false, message });
      return;
    }
    next();
  });
}

router.get('/:module', GenericController.list);
router.get('/:module/:id', GenericController.get);
router.post('/:module', handleAttachments, GenericController.create);
router.put('/:module/:id', handleAttachments, GenericController.update);
router.delete('/:module/:id', GenericController.remove);

export { router as genericRoutes };