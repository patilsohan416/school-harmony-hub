import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';

interface CreateSupplierInput {
  tenantId: string;
  supplierName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  city?: string;
  address?: string;
  status?: string;
  notes?: string;
  createdBy?: string;
}

interface UpdateSupplierInput extends Partial<CreateSupplierInput> {}

export class SupplierService {
  static async getSuppliers(params: {
    tenantId: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      tenantId,
      page = 1,
      limit = 100,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { supplierName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
        // ❌ REMOVED: category
      ];
    }

    if (status) {
      where.status = status;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getSupplierById(id: string, tenantId: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new AppError(404, 'Supplier not found');
    }

    return supplier;
  }

  static async createSupplier(tenantId: string, data: CreateSupplierInput) {
    console.log('📥 Creating supplier with data:', data);

    // Validate required fields
    if (!data.supplierName) {
      throw new AppError(400, 'Supplier name is required');
    }
    if (!data.phone) {
      throw new AppError(400, 'Phone number is required');
    }

    // Check duplicate phone
    const existingPhone = await prisma.supplier.findFirst({
      where: { phone: data.phone, tenantId },
    });

    if (existingPhone) {
      throw new AppError(400, 'Phone number already exists');
    }

    // Check duplicate GST number
    if (data.gstNumber) {
      const existingGst = await prisma.supplier.findFirst({
        where: { gstNumber: data.gstNumber, tenantId },
      });

      if (existingGst) {
        throw new AppError(400, 'GST number already exists');
      }
    }

    // ✅ REMOVED: category from the create data
    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        supplierName: data.supplierName,
        contactPerson: data.contactPerson || null,
        phone: data.phone,
        email: data.email || null,
        gstNumber: data.gstNumber || null,
        city: data.city || null,
        address: data.address || null,
        status: data.status || 'active',
        notes: data.notes || null,
      },
    });

    logger.info(`Supplier created: ${supplier.supplierName} (${supplier.phone})`);

    return supplier;
  }

  static async updateSupplier(
    id: string,
    tenantId: string,
    data: UpdateSupplierInput
  ) {
    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Supplier not found');
    }

    // Check duplicate phone
    if (data.phone && data.phone !== existing.phone) {
      const conflict = await prisma.supplier.findFirst({
        where: { phone: data.phone, tenantId, NOT: { id } },
      });

      if (conflict) {
        throw new AppError(400, 'Phone number already exists');
      }
    }

    // Check duplicate GST number
    if (data.gstNumber && data.gstNumber !== existing.gstNumber) {
      const conflict = await prisma.supplier.findFirst({
        where: { gstNumber: data.gstNumber, tenantId, NOT: { id } },
      });

      if (conflict) {
        throw new AppError(400, 'GST number already exists');
      }
    }

    // ✅ REMOVED: category from the update data
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        supplierName: data.supplierName,
        contactPerson: data.contactPerson || null,
        phone: data.phone,
        email: data.email || null,
        gstNumber: data.gstNumber || null,
        city: data.city || null,
        address: data.address || null,
        status: data.status || 'active',
        notes: data.notes || null,
      },
    });

    logger.info(`Supplier updated: ${supplier.supplierName}`);

    return supplier;
  }

  static async deleteSupplier(id: string, tenantId: string) {
    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Supplier not found');
    }

    await prisma.supplier.delete({
      where: { id },
    });

    logger.info(`Supplier deleted: ${existing.supplierName}`);

    return { success: true, message: 'Supplier deleted successfully' };
  }

  static async getSupplierStatistics(tenantId: string) {
    const [total, active, inactive] = await Promise.all([
      prisma.supplier.count({ where: { tenantId } }),
      prisma.supplier.count({ where: { tenantId, status: 'active' } }),
      prisma.supplier.count({ where: { tenantId, status: 'inactive' } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}