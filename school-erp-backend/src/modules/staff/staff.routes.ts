import { Router } from 'express';
import {
  getStaff,
  getStaffById,
  getStaffByEmployeeId,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffStatus,
  getStaffStatistics,
  getDepartments,
  getDesignations,
  getPrincipalDashboard,
} from './staff.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { uploadStaffPhoto } from '../../middleware/upload';

const router = Router();

// Run authentication on all routes
router.use(authenticate);

// Statistics and lookup routes (specific routes first — must come before
// '/:id' or Express will treat these path segments as an id param)
router.get('/dashboard/principal', getPrincipalDashboard);
router.get('/statistics', authorize(['PRINCIPAL', 'ADMIN']), getStaffStatistics);
router.get('/departments', getDepartments);
router.get('/designations', getDesignations);
router.get('/lookup/:employeeId', getStaffByEmployeeId);

// Main CRUD routes
router.get('/', getStaff);
router.post('/', authorize(['PRINCIPAL', 'ADMIN']), uploadStaffPhoto, createStaff);
router.get('/:id', getStaffById);
router.put('/:id', authorize(['PRINCIPAL', 'ADMIN']), uploadStaffPhoto, updateStaff);
router.patch('/:id/toggle-status', authorize(['PRINCIPAL', 'ADMIN']), toggleStaffStatus);
router.delete('/:id', authorize(['PRINCIPAL', 'ADMIN']), deleteStaff);

export { router as staffRoutes };