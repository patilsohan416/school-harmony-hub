import { Response, NextFunction } from 'express';
import { StaffService } from './staff.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '100',
      search,
      department,
      designation,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, string>;

    const result = await StaffService.getStaff({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 100,
      search,
      department,
      designation,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      sortBy,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('❌ Error in getStaff:', error);
    next(error);
  }
};

export const getStaffById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await StaffService.getStaffById(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('❌ Error in getStaffById:', error);
    next(error);
  }
};

export const getStaffByEmployeeId = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await StaffService.getStaffByEmployeeId(
      req.params.employeeId,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('❌ Error in getStaffByEmployeeId:', error);
    next(error);
  }
};

export const createStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('📥 Received staff data:', req.body);
    console.log('📷 Received file:', req.file);

    const profileImage = req.file
      ? `${req.protocol}://${req.get('host')}/uploads/staff/${req.file.filename}`
      : undefined;

    const staff = await StaffService.createStaff(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      {
        ...req.body,
        ...(profileImage ? { profileImage } : {}),
        createdBy: req.user?.id,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: staff,
    });
  } catch (error) {
    console.error('❌ Error in createStaff:', error);
    next(error);
  }
};

export const updateStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('📥 Received update data:', req.body);
    console.log('📷 Received file:', req.file);

    const profileImage = req.file
      ? `${req.protocol}://${req.get('host')}/uploads/staff/${req.file.filename}`
      : undefined;

    const staff = await StaffService.updateStaff(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID,
      {
        ...req.body,
        ...(profileImage ? { profileImage } : {}),
      }
    );

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      data: staff,
    });
  } catch (error) {
    console.error('❌ Error in updateStaff:', error);
    next(error);
  }
};

export const deleteStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await StaffService.deleteStaff(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      message: result.message || 'Staff member deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error in deleteStaff:', error);
    next(error);
  }
};

export const toggleStaffStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await StaffService.toggleStaffStatus(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      message: `Staff member ${staff.isActive ? 'activated' : 'deactivated'} successfully`,
      data: staff,
    });
  } catch (error) {
    console.error('❌ Error in toggleStaffStatus:', error);
    next(error);
  }
};

export const getStaffStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await StaffService.getStaffStatistics(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error in getStaffStatistics:', error);
    next(error);
  }
};

export const getPrincipalDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await StaffService.getPrincipalDashboard(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('❌ Error in getPrincipalDashboard:', error);
    next(error);
  }
};

export const getDepartments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const departments = await StaffService.getDepartments(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('❌ Error in getDepartments:', error);
    next(error);
  }
};

export const getDesignations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const designations = await StaffService.getDesignations(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: designations,
    });
  } catch (error) {
    console.error('❌ Error in getDesignations:', error);
    next(error);
  }
};