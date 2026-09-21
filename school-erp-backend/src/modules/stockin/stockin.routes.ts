import { Router } from 'express';
import {
  getStockInEntries,
  getStockInEntryById,
  createStockInEntry,
  updateStockInEntry,
  deleteStockInEntry,
  getStockInStatistics,
  getCategories,
} from './stockin.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Run authentication on all routes
router.use(authenticate);

// Statistics and lookup routes
router.get('/statistics', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), getStockInStatistics);
router.get('/categories', getCategories);

// Main CRUD routes
router.get('/', getStockInEntries);
router.get('/:id', getStockInEntryById);
router.post('/', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), createStockInEntry);
router.put('/:id', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), updateStockInEntry);
router.delete('/:id', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), deleteStockInEntry);

export { router as stockInRoutes };