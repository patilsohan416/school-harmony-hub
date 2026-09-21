import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStatistics,
} from './supplier.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Run authentication on all routes
router.use(authenticate);

// Statistics route
router.get('/statistics', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), getSupplierStatistics);

// Main CRUD routes
router.get('/', getSuppliers);
router.post('/', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), createSupplier);
router.get('/:id', getSupplierById);
router.put('/:id', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), updateSupplier);
router.delete('/:id', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), deleteSupplier);

export { router as supplierRoutes };