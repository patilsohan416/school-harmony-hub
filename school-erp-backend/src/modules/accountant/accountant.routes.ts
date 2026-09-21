import { Router } from 'express';
import {
  getDashboard,
  searchStudents,
  getOutstandingFees,
  getFeeTypes,
  collectPayment,
  listCollections,
  listReceipts,
  getReceipt,
  getReceiptStats,
  listPendingFees,
  getPendingFeeStats,
  updatePendingFeeAmount,
  getClassesWithSections,
  getSectionsForClass,      // ✅ NEW
  getClassWiseStudents,
  updateStudentTotalFee,
  listDefaulters,
  getDefaulterStats,
  sendBulkReminders,
} from './accountant.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']));

/* ============================================================
   DASHBOARD
   ============================================================ */
router.get('/dashboard', getDashboard);

/* ============================================================
   LOOKUP DATA
   ============================================================ */
router.get('/classes', getClassesWithSections);
router.get('/sections', getSectionsForClass);   // ✅ NEW
router.get('/students/search', searchStudents);
router.get('/students/:studentId/outstanding-fees', getOutstandingFees);
router.get('/fee-types', getFeeTypes);

/* ============================================================
   CLASS-WISE STUDENTS
   ============================================================ */
router.get('/class-students', getClassWiseStudents);

/* ============================================================
   PAYMENT COLLECTION
   ============================================================ */
router.post('/collect-payment', collectPayment);

/* ============================================================
   COLLECTIONS
   ============================================================ */
router.get('/collections', listCollections);

/* ============================================================
   PENDING FEES
   Order matters: /stats before /:id
   ============================================================ */
router.get('/pending-fees/stats', getPendingFeeStats);
router.patch('/pending-fees/:id/amount', updatePendingFeeAmount);
router.get('/pending-fees', listPendingFees);

/* ============================================================
   STUDENT TOTAL FEE
   ============================================================ */
router.patch('/students/:studentId/total-fee', updateStudentTotalFee);

/* ============================================================
   DEFAULTERS
   Order matters: /stats before generic routes
   ============================================================ */
router.get('/defaulters/stats', getDefaulterStats);
router.post('/defaulters/send-reminders', sendBulkReminders);
router.get('/defaulters', listDefaulters);

/* ============================================================
   RECEIPTS
   Order matters: /stats before /:id
   ============================================================ */
router.get('/receipts/stats', getReceiptStats);
router.get('/receipts', listReceipts);
router.get('/receipts/:id', getReceipt);

export { router as accountantRoutes };