import { Response, NextFunction } from 'express';
import { TeacherService } from './teacher.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getTeachers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '10', search, sortBy, sortOrder } = req.query as Record<string, string>;

    const result = await TeacherService.getTeachers({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      search,
      sortBy,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in getTeachers:', error);
    next(error);
  }
};

export const getMyDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await TeacherService.getMyDashboardData(
      req.user.tenantId || DEFAULT_TENANT_ID,
      req.user.id
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getMyDashboard:', error);
    next(error);
  }
};

export const getTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await TeacherService.getTeacherById(req.user?.tenantId || DEFAULT_TENANT_ID, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getTeacher:', error);
    next(error);
  }
};

export const getTeacherByEmployeeId = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await TeacherService.getTeacherByEmployeeId(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.params.employeeId
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getTeacherByEmployeeId:', error);
    next(error);
  }
};

export const createTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('📥 Received data:', req.body);
    
    const data = await TeacherService.createTeacher(
      req.user?.tenantId || DEFAULT_TENANT_ID, 
      req.body
    );
    
    console.log('✅ Teacher created:', data);
    res.status(201).json({ success: true, message: 'Teacher created successfully', data });
  } catch (error) {
    console.error('❌ Error in createTeacher:', error);
    next(error);
  }
};

export const updateTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('📥 Received update data:', req.body);
    
    const data = await TeacherService.updateTeacher(
      req.user?.tenantId || DEFAULT_TENANT_ID, 
      req.params.id, 
      req.body
    );
    
    console.log('✅ Teacher updated:', data);
    res.json({ success: true, message: 'Teacher updated successfully', data });
  } catch (error) {
    console.error('❌ Error in updateTeacher:', error);
    next(error);
  }
};

export const toggleTeacherStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await TeacherService.toggleTeacherStatus(req.user?.tenantId || DEFAULT_TENANT_ID, req.params.id);
    res.json({ success: true, message: `Teacher ${data.isActive ? 'activated' : 'deactivated'} successfully`, data });
  } catch (error) {
    console.error('Error in toggleTeacherStatus:', error);
    next(error);
  }
};

export const deleteTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await TeacherService.deleteTeacher(req.user?.tenantId || DEFAULT_TENANT_ID, req.params.id);
    res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error in deleteTeacher:', error);
    next(error);
  }
};

export const getTeacherStatistics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await TeacherService.getTeacherStatistics(req.user?.tenantId || DEFAULT_TENANT_ID);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in getTeacherStatistics:', error);
    next(error);
  }
};

export const getDepartmentList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await TeacherService.getDepartmentList(req.user?.tenantId || DEFAULT_TENANT_ID);
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('Error in getDepartmentList:', error);
    next(error);
  }
};

export const getDesignationList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const designations = await TeacherService.getDesignationList(req.user?.tenantId || DEFAULT_TENANT_ID);
    res.json({ success: true, data: designations });
  } catch (error) {
    console.error('Error in getDesignationList:', error);
    next(error);
  }
};