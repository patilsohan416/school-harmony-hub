import { Router } from 'express';
import {
  login,
  register,
  refreshToken,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.post('/change-password', changePassword);

export { router as authRoutes };
