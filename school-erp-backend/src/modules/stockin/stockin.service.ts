import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';

interface CreateStockInInput {
  tenantId: string;
  category: string;
  material: string;
  brandName?: string;
  receiptNumber?: string;
  quantity: number;
  requiredQuantity?: number;
  pricePerUnit: number;
  totalAmount: number;
  supplier?: string;
  date?: string;
  endDate?: string;
  remarks?: string;
  createdBy?: string;
}

interface UpdateStockInInput extends Partial<CreateStockInInput> {}

export class StockInService {
  /**
   * Get all Stock In entries with filters
   */
  static async getStockInEntries(params: {
    tenantId: string;
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      tenantId,
      page = 1,
      limit = 100,
      search,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { material: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        // ✅ Remove supplier from search since it doesn't exist in schema
        // { supplier: { contains: search, mode: 'insensitive' } },
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [entries, total] = await Promise.all([
      prisma.stockInEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.stockInEntry.count({ where }),
    ]);

    return {
      data: entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Stock In entry by ID
   */
  static async getStockInEntryById(id: string, tenantId: string) {
    const entry = await prisma.stockInEntry.findFirst({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new AppError(404, 'Stock In entry not found');
    }

    return entry;
  }

  /**
   * Create Stock In entry
   */
  static async createStockInEntry(tenantId: string, data: CreateStockInInput) {
    // Validate required fields
    if (!data.category) {
      throw new AppError(400, 'Category is required');
    }
    if (!data.material) {
      throw new AppError(400, 'Material is required');
    }
    if (!data.quantity || data.quantity <= 0) {
      throw new AppError(400, 'Valid quantity is required');
    }
    if (!data.pricePerUnit || data.pricePerUnit <= 0) {
      throw new AppError(400, 'Valid price per unit is required');
    }

    // Calculate total amount if not provided
    const totalAmount = data.totalAmount || (data.quantity * data.pricePerUnit);

    const entry = await prisma.stockInEntry.create({
      data: {
        tenantId,
        category: data.category,
        material: data.material,
        brandName: data.brandName || null,
        receiptNumber: data.receiptNumber || null,
        quantity: data.quantity,
        requiredQuantity: data.requiredQuantity || 0,
        pricePerUnit: data.pricePerUnit,
        totalAmount: totalAmount,
        // ✅ Remove supplier field - not in schema
        // supplier: data.supplier || null,
        createdAt: data.date ? new Date(data.date) : new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info(`Stock In entry created: ${entry.id} - ${entry.material} (${entry.quantity})`);

    return entry;
  }

  /**
   * Update Stock In entry
   */
  static async updateStockInEntry(
    id: string,
    tenantId: string,
    data: UpdateStockInInput
  ) {
    const existing = await prisma.stockInEntry.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Stock In entry not found');
    }

    // ✅ Recalculate total amount if quantity or price changes
    let totalAmount: number | undefined = data.totalAmount;
    
    // Use Number() to ensure proper type for arithmetic
    const quantity = data.quantity !== undefined ? Number(data.quantity) : undefined;
    const pricePerUnit = data.pricePerUnit !== undefined ? Number(data.pricePerUnit) : undefined;
    const existingQuantity = Number(existing.quantity);
    const existingPrice = Number(existing.pricePerUnit);

    if (quantity !== undefined && pricePerUnit !== undefined) {
      totalAmount = quantity * pricePerUnit;
    } else if (quantity !== undefined && existingPrice) {
      totalAmount = quantity * existingPrice;
    } else if (pricePerUnit !== undefined && existingQuantity) {
      totalAmount = existingQuantity * pricePerUnit;
    }

    const updateData: any = {
      ...data,
      totalAmount: totalAmount || existing.totalAmount,
      updatedAt: new Date(),
    };

    // Convert dates
    if (data.date) {
      updateData.createdAt = new Date(data.date);
    }

    // ✅ Remove supplier from update data if present
    delete updateData.supplier;

    const entry = await prisma.stockInEntry.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Stock In entry updated: ${entry.id} - ${entry.material}`);

    return entry;
  }

  /**
   * Delete Stock In entry
   */
  static async deleteStockInEntry(id: string, tenantId: string) {
    const existing = await prisma.stockInEntry.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Stock In entry not found');
    }

    await prisma.stockInEntry.delete({
      where: { id },
    });

    logger.info(`Stock In entry deleted: ${id}`);

    return { success: true, message: 'Stock In entry deleted successfully' };
  }

  /**
   * Get Stock In statistics
   */
  static async getStockInStatistics(tenantId: string) {
    const [totalEntries, totalQuantity, totalValue, byCategory] = await Promise.all([
      prisma.stockInEntry.count({ where: { tenantId } }),
      prisma.stockInEntry.aggregate({
        where: { tenantId },
        _sum: { quantity: true },
      }),
      prisma.stockInEntry.aggregate({
        where: { tenantId },
        _sum: { totalAmount: true },
      }),
      prisma.stockInEntry.groupBy({
        by: ['category'],
        where: { tenantId },
        _count: true,
        _sum: {
          quantity: true,
          totalAmount: true,
        },
      }),
    ]);

    return {
      totalEntries,
      totalQuantity: Number(totalQuantity._sum.quantity) || 0,
      totalValue: Number(totalValue._sum.totalAmount) || 0,
      byCategory: byCategory.map((cat) => ({
        category: cat.category,
        count: cat._count,
        totalQuantity: Number(cat._sum.quantity) || 0,
        totalValue: Number(cat._sum.totalAmount) || 0,
      })),
    };
  }

  /**
   * Get categories list
   */
  static async getCategories(tenantId: string) {
    const categories = await prisma.stockInEntry.findMany({
      where: { tenantId },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => c.category).filter(Boolean);
  }
}