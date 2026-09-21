import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';

interface CreateInventoryReportInput {
  tenantId: string;
  month: string;
  monthLabel: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockItems: number;
  categories: Record<string, number>;
  generatedOn: string;
  createdBy?: string;
}

interface UpdateInventoryReportInput extends Partial<CreateInventoryReportInput> {}

export class InventoryReportService {
  /**
   * Get all inventory reports with filters
   */
  static async getInventoryReports(params: {
    tenantId: string;
    page?: number;
    limit?: number;
    search?: string;
    month?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      tenantId,
      page = 1,
      limit = 100,
      search,
      month,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { monthLabel: { contains: search, mode: 'insensitive' } },
        { month: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (month) {
      where.month = month;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [reports, total] = await Promise.all([
      prisma.inventoryReport.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.inventoryReport.count({ where }),
    ]);

    return {
      data: reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get inventory report by ID
   */
  static async getInventoryReportById(id: string, tenantId: string) {
    const report = await prisma.inventoryReport.findFirst({
      where: { id, tenantId },
    });

    if (!report) {
      throw new AppError(404, 'Inventory report not found');
    }

    return report;
  }

  /**
   * Get inventory report by month
   */
  static async getInventoryReportByMonth(month: string, tenantId: string) {
    const report = await prisma.inventoryReport.findFirst({
      where: { month, tenantId },
    });

    return report;
  }

  /**
   * Create inventory report
   */
  static async createInventoryReport(tenantId: string, data: CreateInventoryReportInput) {
    // Validate required fields
    if (!data.month) {
      throw new AppError(400, 'Month is required');
    }
    if (!data.monthLabel) {
      throw new AppError(400, 'Month label is required');
    }

    // Check if report already exists for this month
    const existingReport = await prisma.inventoryReport.findFirst({
      where: { month: data.month, tenantId },
    });

    if (existingReport) {
      // Update existing report instead of creating new one
      const updatedReport = await prisma.inventoryReport.update({
        where: { id: existingReport.id },
        data: {
          totalItems: data.totalItems,
          totalQuantity: data.totalQuantity,
          totalValue: data.totalValue,
          lowStockItems: data.lowStockItems,
          categories: data.categories,
          generatedOn: data.generatedOn || new Date().toISOString().split('T')[0],
          updatedAt: new Date(),
        },
      });

      logger.info(`Inventory report updated for month: ${data.monthLabel}`);
      return updatedReport;
    }

    const report = await prisma.inventoryReport.create({
      data: {
        tenantId,
        month: data.month,
        monthLabel: data.monthLabel,
        totalItems: data.totalItems,
        totalQuantity: data.totalQuantity,
        totalValue: data.totalValue,
        lowStockItems: data.lowStockItems,
        categories: data.categories || {},
        generatedOn: data.generatedOn || new Date().toISOString().split('T')[0],
      },
    });

    logger.info(`Inventory report created: ${report.monthLabel} (${report.month})`);

    return report;
  }

  /**
   * Update inventory report
   */
  static async updateInventoryReport(
    id: string,
    tenantId: string,
    data: UpdateInventoryReportInput
  ) {
    const existing = await prisma.inventoryReport.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Inventory report not found');
    }

    // Check if trying to update to an existing month
    if (data.month && data.month !== existing.month) {
      const conflict = await prisma.inventoryReport.findFirst({
        where: { month: data.month, tenantId, NOT: { id } },
      });

      if (conflict) {
        throw new AppError(400, `Report for ${data.monthLabel} already exists`);
      }
    }

    const report = await prisma.inventoryReport.update({
      where: { id },
      data: {
        month: data.month,
        monthLabel: data.monthLabel,
        totalItems: data.totalItems,
        totalQuantity: data.totalQuantity,
        totalValue: data.totalValue,
        lowStockItems: data.lowStockItems,
        categories: data.categories,
        generatedOn: data.generatedOn,
        updatedAt: new Date(),
      },
    });

    logger.info(`Inventory report updated: ${report.monthLabel}`);

    return report;
  }

  /**
   * Delete inventory report
   */
  static async deleteInventoryReport(id: string, tenantId: string) {
    const existing = await prisma.inventoryReport.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Inventory report not found');
    }

    await prisma.inventoryReport.delete({
      where: { id },
    });

    logger.info(`Inventory report deleted: ${existing.monthLabel}`);

    return { success: true, message: 'Inventory report deleted successfully' };
  }

  /**
   * Get inventory report statistics
   */
  static async getInventoryReportStatistics(tenantId: string) {
    const [total, byMonth] = await Promise.all([
      prisma.inventoryReport.count({ where: { tenantId } }),
      prisma.inventoryReport.groupBy({
        by: ['month'],
        where: { tenantId },
        _count: true,
        _sum: {
          totalItems: true,
          totalQuantity: true,
          totalValue: true,
        },
      }),
    ]);

    return {
      total,
      byMonth: byMonth.map((item) => ({
        month: item.month,
        count: item._count,
        totalItems: item._sum.totalItems || 0,
        totalQuantity: item._sum.totalQuantity || 0,
        totalValue: item._sum.totalValue || 0,
      })),
    };
  }

  /**
   * Get latest report
   */
  static async getLatestReport(tenantId: string) {
    const report = await prisma.inventoryReport.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return report;
  }
}