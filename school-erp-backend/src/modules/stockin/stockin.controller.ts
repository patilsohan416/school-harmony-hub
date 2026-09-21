import { Response, NextFunction } from 'express';
import { StockInService } from './stockin.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getStockInEntries = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '100',
      search,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, string>;

    const result = await StockInService.getStockInEntries({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 100,
      search,
      category,
      sortBy,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });

    // ✅ Fix: Don't duplicate success property
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getStockInEntryById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const entry = await StockInService.getStockInEntryById(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const createStockInEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('📥 Received Stock In data:', req.body);

    const entry = await StockInService.createStockInEntry(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      {
        ...req.body,
        createdBy: req.user?.id,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Stock In entry created successfully',
      data: entry,
    });
  } catch (error) {
    console.error('❌ Error in createStockInEntry:', error);
    next(error);
  }
};

export const updateStockInEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('📥 Received update data:', req.body);

    const entry = await StockInService.updateStockInEntry(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.body
    );

    res.json({
      success: true,
      message: 'Stock In entry updated successfully',
      data: entry,
    });
  } catch (error) {
    console.error('❌ Error in updateStockInEntry:', error);
    next(error);
  }
};

export const deleteStockInEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await StockInService.deleteStockInEntry(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      message: result.message || 'Stock In entry deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error in deleteStockInEntry:', error);
    next(error);
  }
};

export const getStockInStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await StockInService.getStockInStatistics(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error in getStockInStatistics:', error);
    next(error);
  }
};

export const getCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await StockInService.getCategories(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('❌ Error in getCategories:', error);
    next(error);
  }
};