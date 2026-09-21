import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';

interface CreatePayrollInput {
  tenantId: string;
  staffId: string;
  month: string; // "YYYY-MM"
  grossAmount: number;
  deductions?: number;
  remarks?: string;
}

interface UpdatePayrollInput extends Partial<CreatePayrollInput> {}

function toApiShape(p: any) {
  return {
    id: p.id,
    staffId: p.staffId,
    employeeId: p.staff?.employeeId,
    name: p.staff
      ? [p.staff.firstName, p.staff.middleName, p.staff.lastName].filter(Boolean).join(' ')
      : undefined,
    month: p.month,
    gross: Number(p.grossAmount),
    deductions: Number(p.deductions),
    net: Number(p.netAmount),
    remarks: p.remarks,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export class PayrollService {
  /**
   * List payroll records with staff details joined in, optional name search
   */
  static async getPayrollList(params: {
    tenantId: string;
    page: number;
    limit: number;
    search?: string;
    month?: string;
  }) {
    const { tenantId, page, limit, search, month } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (month) where.month = month;

    if (search) {
      where.staff = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [records, total] = await Promise.all([
      prisma.staffPayroll.findMany({
        where,
        include: { staff: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.staffPayroll.count({ where }),
    ]);

    return {
      data: records.map(toApiShape),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new payroll record. Net is always computed server-side —
   * never trust a client-sent net amount.
   */
  static async createPayroll(data: CreatePayrollInput) {
    const staff = await prisma.staff.findFirst({
      where: { id: data.staffId, tenantId: data.tenantId },
    });
    if (!staff) {
      throw new AppError(404, 'Staff member not found');
    }

    const existing = await prisma.staffPayroll.findFirst({
      where: { staffId: data.staffId, month: data.month },
    });
    if (existing) {
      throw new AppError(400, 'A payroll record for this staff member and month already exists');
    }

    const gross = data.grossAmount;
    const deductions = data.deductions ?? 0;

    if (gross < 0 || deductions < 0) {
      throw new AppError(400, 'Amounts cannot be negative');
    }
    if (deductions > gross) {
      throw new AppError(400, 'Deductions cannot exceed gross amount');
    }

    const net = gross - deductions;

    const record = await prisma.staffPayroll.create({
      data: {
        tenantId: data.tenantId,
        staffId: data.staffId,
        month: data.month,
        grossAmount: gross,
        deductions,
        netAmount: net,
        remarks: data.remarks,
      },
      include: { staff: true },
    });

    logger.info(`Payroll created: ${staff.employeeId} - ${data.month}`);

    return toApiShape(record);
  }

  static async updatePayroll(id: string, tenantId: string, data: UpdatePayrollInput) {
    const existing = await prisma.staffPayroll.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new AppError(404, 'Payroll record not found');
    }

    const gross = data.grossAmount ?? Number(existing.grossAmount);
    const deductions = data.deductions ?? Number(existing.deductions);

    if (gross < 0 || deductions < 0) {
      throw new AppError(400, 'Amounts cannot be negative');
    }
    if (deductions > gross) {
      throw new AppError(400, 'Deductions cannot exceed gross amount');
    }

    const record = await prisma.staffPayroll.update({
      where: { id },
      data: {
        grossAmount: gross,
        deductions,
        netAmount: gross - deductions,
        month: data.month ?? existing.month,
        remarks: data.remarks ?? existing.remarks,
      },
      include: { staff: true },
    });

    logger.info(`Payroll updated: ${id}`);

    return toApiShape(record);
  }

  static async deletePayroll(id: string, tenantId: string) {
    const existing = await prisma.staffPayroll.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new AppError(404, 'Payroll record not found');
    }

    await prisma.staffPayroll.delete({ where: { id } });

    logger.info(`Payroll deleted: ${id}`);

    return { success: true };
  }
}