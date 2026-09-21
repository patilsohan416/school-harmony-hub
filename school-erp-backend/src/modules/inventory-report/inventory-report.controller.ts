import { Response, NextFunction } from 'express';
import { InventoryReportService } from './inventory-report.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getInventoryReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '100',
      search,
      month,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, string>;

    const result = await InventoryReportService.getInventoryReports({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 100,
      search,
      month,
      sortBy,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('❌ Error in getInventoryReports:', error);
    next(error);
  }
};

export const getInventoryReportById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const report = await InventoryReportService.getInventoryReportById(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('❌ Error in getInventoryReportById:', error);
    next(error);
  }
};

export const getInventoryReportByMonth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const report = await InventoryReportService.getInventoryReportByMonth(
      req.params.month,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('❌ Error in getInventoryReportByMonth:', error);
    next(error);
  }
};

export const createInventoryReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('📥 Received Inventory Report data:', req.body);

    const report = await InventoryReportService.createInventoryReport(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      {
        ...req.body,
        createdBy: req.user?.id,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Inventory report created successfully',
      data: report,
    });
  } catch (error) {
    console.error('❌ Error in createInventoryReport:', error);
    next(error);
  }
};

export const updateInventoryReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('📥 Received update data:', req.body);

    const report = await InventoryReportService.updateInventoryReport(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.body
    );

    res.json({
      success: true,
      message: 'Inventory report updated successfully',
      data: report,
    });
  } catch (error) {
    console.error('❌ Error in updateInventoryReport:', error);
    next(error);
  }
};

export const deleteInventoryReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await InventoryReportService.deleteInventoryReport(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    // ✅ Fixed: Don't duplicate success property
    res.json({
      success: true,
      message: result.message || 'Inventory report deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error in deleteInventoryReport:', error);
    next(error);
  }
};

export const getInventoryReportStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await InventoryReportService.getInventoryReportStatistics(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error in getInventoryReportStatistics:', error);
    next(error);
  }
};

export const getLatestReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const report = await InventoryReportService.getLatestReport(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('❌ Error in getLatestReport:', error);
    next(error);
  }
};