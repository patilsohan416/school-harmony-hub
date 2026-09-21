import { Router } from 'express';
import {
  getAuditLog, getBankAccounts, getDefaulters, getDiscounts,
  getExpenses, createExpense, getNotifications,
} from './accountant-modules.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']));

router.get('/audit', getAuditLog);
router.get('/bank', getBankAccounts);
router.get('/defaulters', getDefaulters);
router.get('/discounts', getDiscounts);
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.get('/notifications', getNotifications);

export { router as accountantModulesRoutes };
