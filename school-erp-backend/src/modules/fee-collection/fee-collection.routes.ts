import { Router } from 'express';
import {
  listFees, createFee, updateFee, deleteFee, getClasses, assignFeeToStudents,
  searchStudents, getOutstandingFees, collectPayment, listCollections, getDashboard,
} from './fee-collection.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']));

// Fee Setup
router.get('/fees', listFees);
router.post('/fees', createFee);
router.put('/fees/:id', updateFee);
router.delete('/fees/:id', deleteFee);
router.get('/classes', getClasses);
router.post('/fees/:id/assign', assignFeeToStudents);

// Collection
router.get('/students/search', searchStudents);
router.get('/students/:studentId/outstanding-fees', getOutstandingFees);
router.post('/collect-payment', collectPayment);
router.get('/collections', listCollections);

// Dashboard
router.get('/dashboard', getDashboard);

export { router as feeCollectionRoutes };