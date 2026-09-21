import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfDay(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function endOfDay(d = new Date()) { const e = startOfDay(d); e.setDate(e.getDate() + 1); return e; }

export class FeeCollectionService {
  // ── Fee Setup: define fees ──────────────────────────────────────

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

  // ── Assignment: create FeePayment rows for a class's students ──────

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

  // ── Collection: search students, view what's owed, record a payment ──

  static async searchStudentsForCollection(tenantId: string, query: string) {
    if (!query || query.trim().length < 2) return [];
    return prisma.student.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { admissionNo: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { class: true, section: true },
      take: 10,
    });
  }

  static async getStudentOutstandingFees(tenantId: string, studentId: string) {
    return prisma.feePayment.findMany({
      where: { tenantId, studentId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      include: { fee: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  static async collectPayment(
    tenantId: string,
    data: {
      feePaymentId: string;
      amountPaid: number;
      paymentMethod: string;
      transactionId?: string;
      chequeNo?: string;
      bankName?: string;
      remarks?: string;
    }
  ) {
    const existing = await prisma.feePayment.findFirst({ where: { id: data.feePaymentId, tenantId } });
    if (!existing) throw new AppError(404, 'Fee payment record not found');

    const newPaidAmount = Number(existing.paidAmount) + data.amountPaid;
    const totalDue = Number(existing.amount);
    const status = newPaidAmount >= totalDue ? 'PAID' : 'PARTIAL';
    const receiptNo = existing.receiptNo || `RCP${Date.now().toString().slice(-8)}`;

    return prisma.feePayment.update({
      where: { id: existing.id },
      data: {
        paidAmount: newPaidAmount,
        status,
        paymentDate: new Date(),
        paymentMethod: data.paymentMethod as any,
        transactionId: data.transactionId,
        chequeNo: data.chequeNo,
        bankName: data.bankName,
        remarks: data.remarks,
        receiptNo,
      },
    });
  }

  // ── List: paginated, searchable collected-payments table ─────────

  static async listCollections(
    tenantId: string,
    params: { page: number; limit: number; search?: string }
  ) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status: { in: ['PAID', 'PARTIAL'] },
      paymentDate: { not: null },
    };

    if (search && search.trim()) {
      where.student = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { admissionNo: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.feePayment.findMany({
        where,
        include: { student: { include: { class: true, section: true } } },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.feePayment.count({ where }),
    ]);

    return {
      data: rows.map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo || p.id.slice(0, 8).toUpperCase(),
        date: p.paymentDate,
        studentName: `${p.student.firstName} ${p.student.lastName || ''}`.trim(),
        className:
          p.student.class?.name && p.student.section?.name
            ? `${p.student.class.name}-${p.student.section.name}`
            : '-',
        amount: Number(p.paidAmount),
        paymentMode: p.paymentMethod,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Dashboard aggregate (used by the Accountant Dashboard stat cards) ──

  static async getDashboard(tenantId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const [
      collectedThisMonthAgg,
      pendingRows,
      todayAgg,
      overdueCount,
      cashAgg,
      nonCashAgg,
      totalActiveStudents,
      fullyPaidStudentIds,
      dueTodayRows,
      recentTransactions,
      topDefaultersRaw,
      trendRows,
      classRankingRows,
    ] = await Promise.all([
      prisma.feePayment.aggregate({
        where: { tenantId, paymentDate: { gte: monthStart }, status: { in: ['PAID', 'PARTIAL'] } },
        _sum: { paidAmount: true },
      }),
      prisma.feePayment.findMany({
        where: { tenantId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        select: { amount: true, paidAmount: true, studentId: true },
      }),
      prisma.feePayment.aggregate({
        where: { tenantId, paymentDate: { gte: dayStart, lt: dayEnd }, status: { in: ['PAID', 'PARTIAL'] } },
        _sum: { paidAmount: true },
        _count: true,
      }),
      prisma.feePayment.count({ where: { tenantId, status: 'OVERDUE' } }),
      prisma.feePayment.aggregate({
        where: { tenantId, paymentMethod: 'CASH', status: { in: ['PAID', 'PARTIAL'] } },
        _sum: { paidAmount: true },
      }),
      prisma.feePayment.aggregate({
        where: { tenantId, paymentMethod: { not: 'CASH' }, status: { in: ['PAID', 'PARTIAL'] } },
        _sum: { paidAmount: true },
      }),
      prisma.student.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.feePayment.findMany({
        where: { tenantId, status: 'PAID' },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      prisma.feePayment.findMany({
        where: { tenantId, dueDate: { gte: dayStart, lt: dayEnd }, status: { in: ['PENDING', 'PARTIAL'] } },
        select: { amount: true, paidAmount: true },
      }),
      prisma.feePayment.findMany({
        where: { tenantId, status: 'PAID' },
        include: { student: { include: { class: true, section: true } } },
        orderBy: { paymentDate: 'desc' },
        take: 5,
      }),
      prisma.feePayment.findMany({
        where: { tenantId, status: 'OVERDUE' },
        include: { student: { include: { class: true, section: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.feePayment.findMany({
        where: {
          tenantId,
          status: { in: ['PAID', 'PARTIAL'] },
          paymentDate: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
        },
        select: { paidAmount: true, paymentDate: true },
      }),
      prisma.feePayment.findMany({
        where: { tenantId, status: { in: ['PAID', 'PARTIAL'] } },
        select: {
          paidAmount: true,
          amount: true,
          student: { select: { classId: true, class: { select: { name: true } } } },
        },
      }),
    ]);

    const pendingAmount = pendingRows.reduce(
      (sum, p) => sum + (Number(p.amount) - Number(p.paidAmount)),
      0
    );
    const pendingStudentsCount = new Set(pendingRows.map((p) => p.studentId)).size;
    const dueTodayAmount = dueTodayRows.reduce(
      (sum, p) => sum + (Number(p.amount) - Number(p.paidAmount)),
      0
    );

    const trendMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    for (const p of trendRows) {
      if (!p.paymentDate) continue;
      const key = `${p.paymentDate.getFullYear()}-${p.paymentDate.getMonth()}`;
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) || 0) + Number(p.paidAmount));
    }
    const collectionTrend = Array.from(trendMap.entries()).map(([key, total]) => {
      const [y, m] = key.split('-').map(Number);
      return { month: new Date(y, m, 1).toLocaleString('default', { month: 'short' }), total };
    });

    const classMap = new Map<string, { name: string; paid: number; total: number }>();
    for (const p of classRankingRows) {
      const cid = p.student?.classId;
      if (!cid) continue;
      const name = p.student?.class?.name || 'Unknown';
      const entry = classMap.get(cid) || { name, paid: 0, total: 0 };
      entry.paid += Number(p.paidAmount);
      entry.total += Number(p.amount);
      classMap.set(cid, entry);
    }
    const topPayingClasses = Array.from(classMap.values())
      .map((c) => ({
        className: c.name,
        percentage: c.total > 0 ? Math.round((c.paid / c.total) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    const recent = recentTransactions.map((p) => ({
      id: p.id,
      receiptNo: p.receiptNo || p.id.slice(0, 8).toUpperCase(),
      studentName: `${p.student.firstName} ${p.student.lastName || ''}`.trim(),
      className:
        p.student.class?.name && p.student.section?.name
          ? `${p.student.class.name}-${p.student.section.name}`
          : '-',
      amount: Number(p.paidAmount),
      method: p.paymentMethod,
      status: p.status,
    }));

    const topDefaulters = topDefaultersRaw.map((p) => {
      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      );
      return {
        id: p.id,
        studentName: `${p.student.firstName} ${p.student.lastName || ''}`.trim(),
        className:
          p.student.class?.name && p.student.section?.name
            ? `${p.student.class.name}-${p.student.section.name}`
            : '-',
        outstanding: Number(p.amount) - Number(p.paidAmount),
        daysOverdue,
      };
    });

    return {
      stats: {
        collectedThisMonth: Number(collectedThisMonthAgg._sum.paidAmount || 0),
        pendingAmount,
        pendingStudentsCount,
        todayCollected: Number(todayAgg._sum.paidAmount || 0),
        todayTxnCount: todayAgg._count,
        defaultersCount: overdueCount,
        cashInHand: Number(cashAgg._sum.paidAmount || 0),
        bankBalance: Number(nonCashAgg._sum.paidAmount || 0),
        totalActiveStudents,
        fullyPaidStudents: fullyPaidStudentIds.length,
        dueTodayAmount,
        dueTodayCount: dueTodayRows.length,
      },
      collectionTrend,
      topPayingClasses,
      recentTransactions: recent,
      topDefaulters,
    };
  }
}