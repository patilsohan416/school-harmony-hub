import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';
// ❌ Remove this line - not used
// import { buildSchema } from './generic.validation';

export class GenericService {
  static async list(params: {
    tenantId: string;
    module: string;
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, string>;
    fields: any[];
  }) {
    const { tenantId, module, page = 1, limit = 20, search, sortBy, sortOrder = 'desc', filters = {}, fields } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      module,
      deletedAt: null,
    };

    // Apply filters using JSON path
    if (Object.keys(filters).length > 0) {
      where.AND = Object.entries(filters).map(([key, value]) => ({
        data: { path: [key], equals: value },
      }));
    }

    // Search in searchable fields
    if (search) {
      const searchableFields = fields.filter((f: any) => f.searchable).map((f: any) => f.name);
      if (searchableFields.length > 0) {
        where.OR = searchableFields.map((f: string) => ({
          data: { path: [f], string_contains: search },
        }));
      }
    }

    // sortBy may be a real ModuleRecord column (createdAt, updatedAt) or a
    // field that only exists inside the JSON `data` column (e.g. "date",
    // "name"). Prisma can't orderBy the latter directly, so fall back to
    // createdAt for anything that isn't an actual column — otherwise this
    // throws a PrismaClientValidationError and the whole list 500s.
    const SORTABLE_COLUMNS = new Set(['createdAt', 'updatedAt']);
    const orderBy: any = {};
    if (sortBy && SORTABLE_COLUMNS.has(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [records, total] = await Promise.all([
      prisma.moduleRecord.findMany({
        where,
        skip,
        take: Math.min(limit, 100),
        orderBy,
      }),
      prisma.moduleRecord.count({ where }),
    ]);

    const transformedRows = records.map((row: any) => ({
      id: row.id,
      ...(row.data as object),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return {
      data: transformedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async get(id: string, module: string, tenantId: string) {
    const record = await prisma.moduleRecord.findFirst({
      where: { id, module, tenantId, deletedAt: null },
    });

    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    return {
      id: record.id,
      ...(record.data as object),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  static async create(data: {
    tenantId: string;
    module: string;
    data: Record<string, unknown>;
    createdBy: string;
    fields: any[];
  }) {
    // ✅ Convert data to proper JSON format for Prisma
    const jsonData = data.data as any;
    
    const record = await prisma.moduleRecord.create({
      data: {
        tenantId: data.tenantId,
        module: data.module,
        data: jsonData,  // ✅ Now properly typed
        createdBy: data.createdBy,
      },
    });

    logger.info(`Generic record created: ${data.module} by ${data.createdBy}`);

    return {
      id: record.id,
      ...(record.data as object),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  static async update(
    id: string,
    module: string,
    tenantId: string,
    data: Record<string, unknown>,
    userId: string,
    _fields: any[] // ✅ Add underscore to indicate intentionally unused
  ) {
    const existing = await prisma.moduleRecord.findFirst({
      where: { id, module, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'Record not found');
    }

    // ✅ Convert data to proper JSON format for Prisma
    const jsonData = data as any;

    const updated = await prisma.moduleRecord.update({
      where: { id },
      data: {
        data: jsonData,  // ✅ Now properly typed
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    logger.info(`Generic record updated: ${module} ${id}`);

    return {
      id: updated.id,
      ...(updated.data as object),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  static async remove(id: string, module: string, tenantId: string, userId: string) {
    const existing = await prisma.moduleRecord.findFirst({
      where: { id, module, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'Record not found');
    }

    await prisma.moduleRecord.update({
      where: { id },
      data: {
        deletedBy: userId,
        deletedAt: new Date(),
      },
    });

    logger.info(`Generic record deleted: ${module} ${id}`);
  }
}