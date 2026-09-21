import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';

export class FeeSetupService {
  static async listFees(tenantId: string) {
    return prisma.fee.findMany({
      where: { tenantId },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createFee(tenantId: string, data: {
    name: string;
    category: string;
    amount: number;
    frequency: string;
    classId?: string;
    isOptional?: boolean;
    isRefundable?: boolean;
    description?: string;
  }) {
    if (!data.name || !data.amount || !data.category || !data.frequency) {
      throw new AppError(400, 'Name, category, amount, and frequency are required');
    }
    return prisma.fee.create({
      data: {
        tenantId,
        name: data.name,
        category: data.category as any,
        amount: data.amount,
        frequency: data.frequency as any,
        classId: data.classId || null,
        isOptional: data.isOptional ?? false,
        isRefundable: data.isRefundable ?? true,
        description: data.description,
      },
    });
  }

  static async updateFee(tenantId: string, id: string, data: Partial<{
    name: string; category: string; amount: number; frequency: string;
    classId: string | null; isOptional: boolean; isRefundable: boolean; description: string;
  }>) {
    const existing = await prisma.fee.findFirst({ where: { id, tenantId } });
    if (!existing) throw new AppError(404, 'Fee not found');
    return prisma.fee.update({
      where: { id },
      data: { ...data, category: data.category as any, frequency: data.frequency as any },
    });
  }

  static async deleteFee(tenantId: string, id: string) {
    const existing = await prisma.fee.findFirst({ where: { id, tenantId } });
    if (!existing) throw new AppError(404, 'Fee not found');
    const paymentCount = await prisma.feePayment.count({ where: { feeId: id } });
    if (paymentCount > 0) {
      throw new AppError(400, `Can't delete — ${paymentCount} payment record(s) already reference this fee`);
    }
    await prisma.fee.delete({ where: { id } });
    return { success: true };
  }

  static async getClasses(tenantId: string) {
    return prisma.class.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { order: 'asc' },
    });
  }

  static async assignFeeToStudents(tenantId: string, feeId: string, dueDate: string) {
    const fee = await prisma.fee.findFirst({ where: { id: feeId, tenantId } });
    if (!fee) throw new AppError(404, 'Fee not found');
    if (!dueDate) throw new AppError(400, 'Due date is required');

    const students = await prisma.student.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        ...(fee.classId ? { classId: fee.classId } : {}),
      },
      select: { id: true },
    });

    if (students.length === 0) {
      return { assigned: 0, skipped: 0, message: "No active students matched this fee's class" };
    }

    const existingPayments = await prisma.feePayment.findMany({
      where: { tenantId, feeId, studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true },
    });
    const alreadyAssigned = new Set(existingPayments.map((p) => p.studentId));
    const toAssign = students.filter((s) => !alreadyAssigned.has(s.id));

    if (toAssign.length > 0) {
      await prisma.feePayment.createMany({
        data: toAssign.map((s) => ({
          tenantId,
          studentId: s.id,
          feeId,
          amount: fee.amount,
          paidAmount: 0,
          dueDate: new Date(dueDate),
          status: 'PENDING' as const,
        })),
      });
    }

    return {
      assigned: toAssign.length,
      skipped: alreadyAssigned.size,
      message: `Assigned to ${toAssign.length} student(s)${alreadyAssigned.size > 0 ? `, ${alreadyAssigned.size} already had it` : ''}`,
    };
  }
}