import { Router } from 'express';
import {
  getInventoryReports,
  getInventoryReportById,
  getInventoryReportByMonth,
  createInventoryReport,
  updateInventoryReport,
  deleteInventoryReport,
  getInventoryReportStatistics,
  getLatestReport,
} from './inventory-report.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Run authentication on all routes
router.use(authenticate);

// Statistics and lookup routes (specific routes first)
router.get('/statistics', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), getInventoryReportStatistics);
router.get('/latest', getLatestReport);
router.get('/month/:month', getInventoryReportByMonth);

// Main CRUD routes
router.get('/', getInventoryReports);
router.post('/', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), createInventoryReport);
router.get('/:id', getInventoryReportById);
router.put('/:id', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), updateInventoryReport);
router.delete('/:id', authorize(['PRINCIPAL', 'ADMIN', 'ACCOUNTANT']), deleteInventoryReport);

export { router as inventoryReportRoutes };