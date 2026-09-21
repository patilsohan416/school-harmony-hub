import { Response, NextFunction } from 'express';
import { SupplierService } from './supplier.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getSuppliers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '100',
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, string>;

    const result = await SupplierService.getSuppliers({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 100,
      search,
      status,
      sortBy,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplier = await SupplierService.getSupplierById(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    console.log('📥 Received supplier data:', req.body);

    const supplier = await SupplierService.createSupplier(
      tenantId,
      {
        ...req.body,
        createdBy: req.user?.id,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    console.error('❌ Error in createSupplier:', error);
    next(error);
  }
};

export const updateSupplier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('📥 Received update data:', req.body);

    const supplier = await SupplierService.updateSupplier(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.body
    );

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error) {
    console.error('❌ Error in updateSupplier:', error);
    next(error);
  }
};

export const deleteSupplier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await SupplierService.deleteSupplier(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      message: result.message || 'Supplier deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error in deleteSupplier:', error);
    next(error);
  }
};

export const getSupplierStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await SupplierService.getSupplierStatistics(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error in getSupplierStatistics:', error);
    next(error);
  }
};