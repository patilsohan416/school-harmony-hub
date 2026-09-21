import { Router } from 'express';
import { getPublicOpenClasses, submitPublicAdmission } from './admission.controller';

const router = Router();

// No authenticate() here on purpose — this is the public application form
// a parent reaches by scanning a QR code, before they have any account.
router.get('/classes', getPublicOpenClasses);
router.post('/apply', submitPublicAdmission);

export { router as publicAdmissionRoutes };