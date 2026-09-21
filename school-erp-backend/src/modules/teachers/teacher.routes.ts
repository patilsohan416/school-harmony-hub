import { Router } from 'express';
import {
  getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher, getMyDashboard,
} from './teacher.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Must come before '/:id' or express will treat "me" as an id param.
router.get('/me/dashboard', getMyDashboard);

router.get('/', getTeachers);
router.get('/:id', getTeacher);
router.post('/', authorize(['PRINCIPAL', 'ADMIN']), createTeacher);
router.put('/:id', authorize(['PRINCIPAL', 'ADMIN']), updateTeacher);
router.delete('/:id', authorize(['PRINCIPAL', 'ADMIN']), deleteTeacher);

export { router as teacherRoutes };