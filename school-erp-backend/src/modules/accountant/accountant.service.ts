import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d = new Date()) {
  const e = startOfDay(d);
  e.setDate(e.getDate() + 1);
  return e;
}

export class AccountantService {
  /* ============================================================
     DASHBOARD
     ============================================================ */
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
        where: {
          tenantId,
          paymentDate: { gte: monthStart },
          status: { in: ['PAID', 'PARTIAL'] },
        },
        _sum: { paidAmount: true },
      }),
      prisma.feePayment.findMany({
        where: {
          tenantId,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        },
        select: { amount: true, paidAmount: true, studentId: true },
      }),
      prisma.feePayment.aggregate({
        where: {
          tenantId,
          paymentDate: { gte: dayStart, lt: dayEnd },
          status: { in: ['PAID', 'PARTIAL'] },
        },
        _sum: { paidAmount: true },
        _count: true,
      }),
      prisma.feePayment.count({ where: { tenantId, status: 'OVERDUE' } }),
      prisma.feePayment.aggregate({
        where: {
          tenantId,
          paymentMethod: 'CASH',
          status: { in: ['PAID', 'PARTIAL'] },
        },
        _sum: { paidAmount: true },
      }),
      prisma.feePayment.aggregate({
        where: {
          tenantId,
          paymentMethod: { not: 'CASH' },
          status: { in: ['PAID', 'PARTIAL'] },
        },
        _sum: { paidAmount: true },
      }),
      prisma.student.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.feePayment.findMany({
        where: { tenantId, status: 'PAID' },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      prisma.feePayment.findMany({
        where: {
          tenantId,
          dueDate: { gte: dayStart, lt: dayEnd },
          status: { in: ['PENDING', 'PARTIAL'] },
        },
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
          paymentDate: {
            gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          },
        },
        select: { paidAmount: true, paymentDate: true },
      }),
      prisma.feePayment.findMany({
        where: { tenantId, status: { in: ['PAID', 'PARTIAL'] } },
        select: {
          paidAmount: true,
          amount: true,
          student: {
            select: {
              classId: true,
              class: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const pendingAmount = pendingRows.reduce(
      (sum, p) => sum + (Number(p.amount) - Number(p.paidAmount)),
      0
    );
    const pendingStudentsCount = new Set(pendingRows.map((p) => p.studentId))
      .size;
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
      if (trendMap.has(key))
        trendMap.set(key, (trendMap.get(key) || 0) + Number(p.paidAmount));
    }
    const collectionTrend = Array.from(trendMap.entries()).map(
      ([key, total]) => {
        const [y, m] = key.split('-').map(Number);
        return {
          month: new Date(y, m, 1).toLocaleString('default', {
            month: 'short',
          }),
          total,
        };
      }
    );

    const classMap = new Map<
      string,
      { name: string; paid: number; total: number }
    >();
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
        percentage:
          c.total > 0 ? Math.round((c.paid / c.total) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    const recent = recentTransactions.map((p) => ({
      id: p.id,
      receiptNo: p.receiptNo || p.id.slice(0, 8).toUpperCase(),
      studentName: `${p.student.firstName} ${
        p.student.lastName || ''
      }`.trim(),
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
        Math.floor(
          (now.getTime() - new Date(p.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      return {
        id: p.id,
        studentName: `${p.student.firstName} ${
          p.student.lastName || ''
        }`.trim(),
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
        collectedThisMonth: Number(
          collectedThisMonthAgg._sum.paidAmount || 0
        ),
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

  /* ============================================================
     SEARCH STUDENTS
     ============================================================ */
  static async searchStudentsForCollection(
    tenantId: string,
    query: string
  ) {
    if (!query || query.trim().length < 2) return [];

    const words = query.trim().split(/\s+/);

    return prisma.student.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: words.flatMap((w) => [
          { firstName: { contains: w, mode: 'insensitive' } },
          { lastName: { contains: w, mode: 'insensitive' } },
          { admissionNo: { contains: w, mode: 'insensitive' } },
        ]),
      },
      include: { class: true, section: true },
      take: 15,
    });
  }

  /* ============================================================
     STUDENT OUTSTANDING FEES
     ============================================================ */
  static async getStudentOutstandingFees(
    tenantId: string,
    studentId: string
  ) {
    return prisma.feePayment.findMany({
      where: {
        tenantId,
        studentId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      include: { fee: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  /* ============================================================
     LIST FEE TYPES
     ============================================================ */
  static async listFeeTypes(tenantId: string, classId?: string) {
    return prisma.fee.findMany({
      where: {
        tenantId,
        OR: [{ classId: null }, ...(classId ? [{ classId }] : [])],
      },
      orderBy: { name: 'asc' },
    });
  }

  /* ============================================================
     COLLECT PAYMENT
     ============================================================ */
  static async collectPayment(
    tenantId: string,
    data: {
      feePaymentId?: string;
      feeId?: string;
      feeName?: string;
      studentId?: string;
      dueDate?: string;
      amountPaid: number;
      paymentMethod: string;
      transactionId?: string;
      chequeNo?: string;
      bankName?: string;
      remarks?: string;
    }
  ) {
    console.log('[collectPayment] input:', {
      tenantId,
      feePaymentId: data.feePaymentId,
      feeId: data.feeId,
      feeName: data.feeName,
      studentId: data.studentId,
      amountPaid: data.amountPaid,
    });

    if (!data.feePaymentId && !data.feeId && !data.feeName) {
      throw new AppError(400, 'No fee selected — please choose a fee first');
    }

    let existing: any = null;

    if (data.feePaymentId) {
      existing = await prisma.feePayment.findFirst({
        where: { id: data.feePaymentId, tenantId },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          fee: { select: { name: true } },
        },
      });
    }

    let feeId = data.feeId;

    if (!existing && !feeId && data.feeName) {
      let feeType = await prisma.fee.findFirst({
        where: { tenantId, name: data.feeName },
      });

      if (!feeType) {
        console.log('[collectPayment] creating new Fee:', data.feeName);
        feeType = await prisma.fee.create({
          data: {
            tenantId,
            name: data.feeName,
            category: 'OTHER' as any,
            amount: data.amountPaid,
            frequency: 'ONE_TIME' as any,
            isOptional: true,
            isRefundable: false,
            description: 'Auto-created from fee collection',
          },
        });
      }

      feeId = feeType.id;
    }

    if (!existing) {
      if (!feeId || !data.studentId) {
        throw new AppError(
          404,
          'Fee payment record not found — it may have been paid or removed. Please refresh and try again.'
        );
      }

      const feeType = await prisma.fee.findFirst({
        where: { id: feeId, tenantId },
      });
      if (!feeType) {
        throw new AppError(404, 'Selected fee type not found');
      }

      const student = await prisma.student.findFirst({
        where: { id: data.studentId, tenantId },
      });
      if (!student) {
        throw new AppError(404, 'Student not found');
      }

      console.log(
        '[collectPayment] creating FeePayment for student:',
        data.studentId
      );

      existing = await prisma.feePayment.create({
        data: {
          tenantId,
          studentId: data.studentId,
          feeId: feeId,
          amount: feeType.amount,
          paidAmount: 0,
          dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
          status: 'PENDING',
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          fee: { select: { name: true } },
        },
      });
    }

    if (existing.status === 'PAID') {
      throw new AppError(400, 'This fee has already been fully paid');
    }

    const totalDue = Number(existing.amount);
    const alreadyPaid = Number(existing.paidAmount);
    const remainingDue = totalDue - alreadyPaid;

    if (!data.amountPaid || data.amountPaid <= 0) {
      throw new AppError(400, 'Amount must be greater than 0');
    }

    const effectiveDue = Math.max(remainingDue, Number(data.amountPaid));

    const newPaidAmount = alreadyPaid + Number(data.amountPaid);
    const status = newPaidAmount >= effectiveDue ? 'PAID' : 'PARTIAL';

    const receiptNo =
      existing.receiptNo ||
      `RCP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(
        Date.now()
      ).slice(-4)}`;

    const updated = await prisma.feePayment.update({
      where: { id: existing.id },
      data: {
        amount: effectiveDue,
        paidAmount: newPaidAmount,
        status,
        paymentDate: new Date(),
        paymentMethod: data.paymentMethod as any,
        transactionId: data.transactionId || null,
        chequeNo: data.chequeNo || null,
        bankName: data.bankName || null,
        remarks: data.remarks || null,
        receiptNo,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        fee: { select: { name: true } },
      },
    });

    console.log('[collectPayment] success:', updated.id);
    return updated;
  }

  /* ============================================================
     LIST COLLECTIONS
     ============================================================ */
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
      const words = search.trim().split(/\s+/);
      where.student = {
        OR: words.flatMap((w: string) => [
          { firstName: { contains: w, mode: 'insensitive' } },
          { lastName: { contains: w, mode: 'insensitive' } },
          { admissionNo: { contains: w, mode: 'insensitive' } },
        ]),
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
        studentName: `${p.student.firstName} ${
          p.student.lastName || ''
        }`.trim(),
        className:
          p.student.class?.name && p.student.section?.name
            ? `${p.student.class.name}-${p.student.section.name}`
            : '-',
        totalFee: Number(p.amount),
        paidAmount: Number(p.paidAmount),
        paymentMode: p.paymentMethod,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================================
     LIST RECEIPTS
     ============================================================ */
  static async listReceipts(
    tenantId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      from?: string;
      to?: string;
      method?: string;
      classId?: string;
    }
  ) {
    const { page, limit, search, from, to, method, classId } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status: { in: ['PAID', 'PARTIAL'] },
      paymentDate: { not: null },
      receiptNo: { not: null },
    };

    if (from || to) {
      where.paymentDate = { not: null };
      if (from) where.paymentDate.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.paymentDate.lte = toDate;
      }
    }

    if (method && method !== 'all') {
      where.paymentMethod = method;
    }

    if (classId && classId !== 'all') {
      where.student = { ...(where.student || {}), classId };
    }

    if (search && search.trim()) {
      const words = search.trim().split(/\s+/);
      where.OR = [
        { receiptNo: { contains: search.trim(), mode: 'insensitive' } },
        {
          student: {
            OR: words.flatMap((w: string) => [
              { firstName: { contains: w, mode: 'insensitive' } },
              { lastName: { contains: w, mode: 'insensitive' } },
              { admissionNo: { contains: w, mode: 'insensitive' } },
            ]),
          },
        },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.feePayment.findMany({
        where,
        include: {
          student: { include: { class: true, section: true } },
          fee: { select: { id: true, name: true } },
        },
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
        studentId: p.student.id,
        studentName: `${p.student.firstName} ${
          p.student.lastName || ''
        }`.trim(),
        admissionNo: p.student.admissionNo,
        className:
          p.student.class?.name && p.student.section?.name
            ? `${p.student.class.name}-${p.student.section.name}`
            : '-',
        feeName: p.fee?.name || 'Fee',
        amount: Number(p.paidAmount),
        totalAmount: Number(p.amount),
        status: p.status,
        paymentMode: p.paymentMethod,
        transactionId: p.transactionId,
        remarks: p.remarks,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================================
     GET SINGLE RECEIPT BY ID
     ============================================================ */
  static async getReceiptById(tenantId: string, receiptId: string) {
    const receipt = await prisma.feePayment.findFirst({
      where: { id: receiptId, tenantId },
      include: {
        student: { include: { class: true, section: true } },
        fee: { select: { id: true, name: true } },
      },
    });

    if (!receipt) return null;

    return {
      id: receipt.id,
      receiptNo: receipt.receiptNo || receipt.id.slice(0, 8).toUpperCase(),
      date: receipt.paymentDate,
      studentName: `${receipt.student.firstName} ${
        receipt.student.lastName || ''
      }`.trim(),
      admissionNo: receipt.student.admissionNo,
      className:
        receipt.student.class?.name && receipt.student.section?.name
          ? `${receipt.student.class.name}-${receipt.student.section.name}`
          : '-',
      feeName: receipt.fee?.name || 'Fee',
      amount: Number(receipt.paidAmount),
      totalAmount: Number(receipt.amount),
      status: receipt.status,
      paymentMode: receipt.paymentMethod,
      transactionId: receipt.transactionId,
      remarks: receipt.remarks,
    };
  }

  /* ============================================================
     RECEIPT STATS
     ============================================================ */
  static async getReceiptStats(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const [
      totalCount,
      todayCount,
      monthCount,
      totalAmountAgg,
      todayAmountAgg,
      monthAmountAgg,
    ] = await Promise.all([
      prisma.feePayment.count({
        where: {
          tenantId,
          status: { in: ['PAID', 'PARTIAL'] },
          receiptNo: { not: null },
        },
      }),
      prisma.feePayment.count({
        where: {
          tenantId,
          status: { in: ['PAID', 'PARTIAL'] },
          receiptNo: { not: null },
          paymentDate: { gte: todayStart },
        },
      }),
      prisma.feePayment.count({
        where: {
          tenantId,
          status: { in: ['PAID', 'PARTIAL'] },
          receiptNo: { not: null },
          paymentDate: { gte: monthStart },
        },
      }),
      prisma.feePayment.aggregate({
        where: {
          tenantId,
          status: { in: ['PAID', 'PARTIAL'] },
          receiptNo: { not: null },
        },
        _sum: { paidAmount: true },
      }),
      prisma.feePayment.aggregate({
        where: {
          tenantId,
          status: { in: ['PAID', 'PARTIAL'] },
          receiptNo: { not: null },
          paymentDate: { gte: todayStart },
        },
        _sum: { paidAmount: true },
      }),
      prisma.feePayment.aggregate({
        where: {
          tenantId,
          status: { in: ['PAID', 'PARTIAL'] },
          receiptNo: { not: null },
          paymentDate: { gte: monthStart },
        },
        _sum: { paidAmount: true },
      }),
    ]);

    return {
      totalCount,
      todayCount,
      monthCount,
      totalAmount: Number(totalAmountAgg._sum.paidAmount || 0),
      todayAmount: Number(todayAmountAgg._sum.paidAmount || 0),
      monthAmount: Number(monthAmountAgg._sum.paidAmount || 0),
    };
  }

  /* ============================================================
     LIST PENDING FEES
     ============================================================ */
  static async listPendingFees(
    tenantId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      classId?: string;
      status?: string;
      dueFilter?: string;
    }
  ) {
    const { page, limit, search, classId, status, dueFilter } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (classId && classId !== 'all') {
      where.student = {
        ...(where.student || {}),
        class: { name: classId },
      };
    }

    if (search && search.trim()) {
      const words = search.trim().split(/\s+/);
      where.OR = [
        { receiptNo: { contains: search.trim(), mode: 'insensitive' } },
        {
          student: {
            OR: words.flatMap((w: string) => [
              { firstName: { contains: w, mode: 'insensitive' } },
              { lastName: { contains: w, mode: 'insensitive' } },
              { admissionNo: { contains: w, mode: 'insensitive' } },
            ]),
          },
        },
      ];
    }

    if (dueFilter && dueFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueFilter === 'overdue') {
        where.dueDate = { lt: today };
      } else if (dueFilter === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        where.dueDate = { gte: today, lt: tomorrow };
      } else if (dueFilter === 'week') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        where.dueDate = { gte: today, lte: nextWeek };
      } else if (dueFilter === 'month') {
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        where.dueDate = { gte: today, lte: nextMonth };
      }
    }

    const [rows, total] = await Promise.all([
      prisma.feePayment.findMany({
        where,
        include: {
          student: { include: { class: true, section: true } },
          fee: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.feePayment.count({ where }),
    ]);

    const now = new Date();

    return {
      data: rows.map((p) => {
        const totalAmt = Number(p.amount);
        const paid = Number(p.paidAmount);
        const due = totalAmt - paid;
        const dueDate = p.dueDate ? new Date(p.dueDate) : null;
        const daysOverdue = dueDate
          ? Math.max(
              0,
              Math.floor(
                (now.getTime() - dueDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 0;

        return {
          id: p.id,
          receiptNo: p.receiptNo,
          date: p.paymentDate,
          studentId: p.student.id,
          studentName: `${p.student.firstName} ${
            p.student.lastName || ''
          }`.trim(),
          admissionNo: p.student.admissionNo,
          rollNumber: p.student.rollNumber,
          classId: p.student.classId,
          className: p.student.class?.name || '',
          sectionName: p.student.section?.name || '',
          guardianMobile: p.student.guardianMobile,
          feeName: p.fee?.name || 'Fee',
          totalFee: totalAmt,
          paidAmount: paid,
          dueAmount: due,
          dueDate: p.dueDate,
          daysOverdue,
          status: p.status,
          paymentMode: p.paymentMethod,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================================
     PENDING FEE STATS
     ============================================================ */
  static async getPendingFeeStats(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const rows = await prisma.feePayment.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      select: {
        amount: true,
        paidAmount: true,
        studentId: true,
        dueDate: true,
      },
    });

    let totalFee = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let dueTodayAmount = 0;
    const studentSet = new Set<string>();

    for (const row of rows) {
      const amount = Number(row.amount);
      const paid = Number(row.paidAmount);
      const due = amount - paid;

      totalFee += amount;
      totalPaid += paid;
      totalDue += due;
      studentSet.add(row.studentId);

      if (row.dueDate) {
        const dd = new Date(row.dueDate);
        if (dd < todayStart) overdueCount++;
        if (dd.toDateString() === todayStart.toDateString()) {
          dueTodayCount++;
          dueTodayAmount += due;
        }
      }
    }

    return {
      totalRecords: rows.length,
      totalFee,
      totalPaid,
      totalDue,
      overdueCount,
      studentCount: studentSet.size,
      dueTodayCount,
      dueTodayAmount,
    };
  }

  /* ============================================================
     UPDATE PENDING FEE AMOUNT
     ============================================================ */
  static async updatePendingFeeAmount(
    tenantId: string,
    feePaymentId: string,
    newTotalAmount: number
  ) {
    if (!newTotalAmount || newTotalAmount <= 0) {
      throw new AppError(400, 'Total fee must be greater than 0');
    }

    const existing = await prisma.feePayment.findFirst({
      where: { id: feePaymentId, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Fee payment record not found');
    }

    const alreadyPaid = Number(existing.paidAmount);
    if (newTotalAmount < alreadyPaid) {
      throw new AppError(
        400,
        `Total fee cannot be less than already-paid amount (Rs. ${alreadyPaid.toFixed(
          2
        )})`
      );
    }

    const newStatus =
      alreadyPaid >= newTotalAmount
        ? 'PAID'
        : alreadyPaid > 0
        ? 'PARTIAL'
        : 'PENDING';

    const updated = await prisma.feePayment.update({
      where: { id: existing.id },
      data: {
        amount: newTotalAmount,
        status: newStatus,
      },
    });

    return {
      id: updated.id,
      totalFee: Number(updated.amount),
      paidAmount: Number(updated.paidAmount),
      dueAmount: Number(updated.amount) - Number(updated.paidAmount),
      status: updated.status,
    };
  }

  /* ============================================================
     GET CLASSES WITH SECTIONS
     ============================================================ */
  static async getClassesWithSections(tenantId: string) {
    const classes = await prisma.class.findMany({
      where: { tenantId, isActive: true },
      include: {
        sections: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      sections: c.sections,
    }));
  }

  /* ============================================================
     GET SECTIONS FOR A CLASS (for dropdown)
     ============================================================ */
  static async getSectionsForClass(tenantId: string, className: string) {
    const sections = await prisma.section.findMany({
      where: {
        tenantId,
        class: { name: className },
        isActive: true,
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return sections;
  }

  /* ============================================================
     CLASS-WISE STUDENT FEE LIST
     ============================================================ */
  static async getClassWiseStudents(
    tenantId: string,
    params: {
      classId?: string;
      sectionId?: string;
      search?: string;
      status?: string;
    }
  ) {
    const { classId, sectionId, search, status } = params;

    const where: any = {
      tenantId,
      status: 'ACTIVE',
    };

    if (classId && classId !== 'all') where.classId = classId;
    if (sectionId && sectionId !== 'all') where.sectionId = sectionId;
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/);
      where.OR = words.flatMap((w: string) => [
        { firstName: { contains: w, mode: 'insensitive' } },
        { lastName: { contains: w, mode: 'insensitive' } },
        { admissionNo: { contains: w, mode: 'insensitive' } },
      ]);
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: true,
        section: true,
        feePayments: {
          select: {
            id: true,
            amount: true,
            paidAmount: true,
            dueDate: true,
            status: true,
            fee: { select: { id: true, name: true, category: true } },
            paymentDate: true,
            receiptNo: true,
          },
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: [
        { class: { order: 'asc' } },
        { section: { name: 'asc' } },
        { rollNumber: 'asc' },
      ],
    });

    const now = new Date();

    const rows = students.map((s) => {
      const totalFee = s.feePayments.reduce(
        (sum, fp) => sum + Number(fp.amount),
        0
      );
      const totalPaid = s.feePayments.reduce(
        (sum, fp) => sum + Number(fp.paidAmount),
        0
      );
      const due = Math.max(0, totalFee - totalPaid);

      const unpaid = s.feePayments
        .filter((fp) => fp.status !== 'PAID' && fp.dueDate)
        .sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() -
            new Date(b.dueDate!).getTime()
        );
      const nextDueDate = unpaid[0]?.dueDate || null;

      const daysOverdue = nextDueDate
        ? Math.max(
            0,
            Math.floor(
              (now.getTime() - new Date(nextDueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 0;

      let computedStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'NO_FEE' = 'NO_FEE';
      if (totalFee === 0) computedStatus = 'NO_FEE';
      else if (due === 0) computedStatus = 'PAID';
      else if (totalPaid > 0) computedStatus = 'PARTIAL';
      else computedStatus = 'PENDING';

      return {
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName || ''}`.trim(),
        admissionNo: s.admissionNo,
        rollNumber: s.rollNumber,
        guardianMobile: s.guardianMobile,
        classId: s.classId,
        className: s.class?.name || '-',
        sectionId: s.sectionId,
        sectionName: s.section?.name || '-',
        totalFee,
        totalPaid,
        dueAmount: due,
        nextDueDate,
        daysOverdue,
        status: computedStatus,
        feePayments: s.feePayments.map((fp) => ({
          id: fp.id,
          feeName: fp.fee?.name || 'Fee',
          feeCategory: fp.fee?.category || 'MISC',
          amount: Number(fp.amount),
          paid: Number(fp.paidAmount),
          dueDate: fp.dueDate,
          status: fp.status,
          paymentDate: fp.paymentDate,
          receiptNo: fp.receiptNo,
        })),
      };
    });

    let filtered = rows;
    if (status && status !== 'all') {
      if (status === 'HAS_DUE') {
        filtered = rows.filter((r) => r.dueAmount > 0);
      } else if (status === 'OVERDUE') {
        filtered = rows.filter((r) => r.daysOverdue > 0);
      } else {
        filtered = rows.filter((r) => r.status === status);
      }
    }

    return { data: filtered };
  }

  /* ============================================================
     UPDATE STUDENT TOTAL FEE
     ============================================================ */
  static async updateStudentTotalFee(
    tenantId: string,
    studentId: string,
    newTotalFee: number
  ) {
    if (!newTotalFee || newTotalFee <= 0) {
      throw new AppError(400, 'Total fee must be greater than 0');
    }

    const payments = await prisma.feePayment.findMany({
      where: { tenantId, studentId },
      orderBy: { dueDate: 'asc' },
    });

    if (payments.length === 0) {
      throw new AppError(
        400,
        'No fee payments exist for this student. Assign a fee first.'
      );
    }

    const totalPaid = payments.reduce(
      (sum, p) => sum + Number(p.paidAmount),
      0
    );

    if (newTotalFee < totalPaid) {
      throw new AppError(
        400,
        `Total fee cannot be less than already-paid amount (Rs. ${totalPaid.toFixed(
          2
        )})`
      );
    }

    const oldTotal = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    if (oldTotal === 0) {
      await prisma.feePayment.update({
        where: { id: payments[0].id },
        data: {
          amount: newTotalFee,
          status:
            totalPaid >= newTotalFee
              ? 'PAID'
              : totalPaid > 0
              ? 'PARTIAL'
              : 'PENDING',
        },
      });
    } else {
      let allocated = 0;
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        const isLast = i === payments.length - 1;

        const proportion = Number(p.amount) / oldTotal;
        const newAmount = isLast
          ? newTotalFee - allocated
          : Math.round(newTotalFee * proportion * 100) / 100;

        allocated += newAmount;

        const paid = Number(p.paidAmount);
        const status =
          paid >= newAmount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

        await prisma.feePayment.update({
          where: { id: p.id },
          data: { amount: newAmount, status },
        });
      }
    }

    return {
      studentId,
      totalFee: newTotalFee,
      totalPaid,
      dueAmount: newTotalFee - totalPaid,
    };
  }

  /* ============================================================
     ✅ LIST DEFAULTERS — ALL STUDENTS FROM DATABASE
     Starts from Student table. Shows every student even without
     fee records. Aggregates fees per student.
     ============================================================ */
  static async listDefaulters(
    tenantId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      classId?: string;
      sectionId?: string;
      paymentStatus?: string;
      overdueFilter?: string;
      sortBy?: string;
    }
  ) {
    const {
      page,
      limit,
      search,
      classId,
      sectionId,
      paymentStatus,
      overdueFilter,
    } = params;
    const skip = (page - 1) * limit;

    const now = new Date();

    /* BUILD STUDENT WHERE */
    const where: any = {
      tenantId,
      status: 'ACTIVE',
    };

    if (classId && classId !== 'all') {
      where.class = { name: classId };
    }

    if (sectionId && sectionId !== 'all') {
      where.section = { name: sectionId };
    }

    if (search && search.trim()) {
      const words = search.trim().split(/\s+/);
      const rollNum = Number(search.trim());

      where.OR = [
        ...(isNaN(rollNum) ? [] : [{ rollNumber: rollNum }]),
        ...words.flatMap((w: string) => [
          { firstName: { contains: w, mode: 'insensitive' } },
          { lastName: { contains: w, mode: 'insensitive' } },
          { admissionNo: { contains: w, mode: 'insensitive' } },
        ]),
      ];
    }

    /* FETCH STUDENTS WITH THEIR FEES */
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: true,
          section: true,
          feePayments: {
            include: {
              fee: { select: { id: true, name: true } },
            },
            orderBy: { dueDate: 'asc' },
          },
        },
        orderBy: [
          { class: { order: 'asc' } },
          { section: { name: 'asc' } },
          { rollNumber: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    /* MAP TO ROWS */
    let rows = students.map((s) => {
      const payments = s.feePayments || [];

      const totalFee = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const paidAmount = payments.reduce(
        (sum, p) => sum + Number(p.paidAmount),
        0
      );
      const dueAmount = Math.max(0, totalFee - paidAmount);

      const unpaidPayments = payments
        .filter((p) => Number(p.paidAmount) < Number(p.amount))
        .sort(
          (a, b) =>
            new Date(a.dueDate || 0).getTime() -
            new Date(b.dueDate || 0).getTime()
        );

      const nextDueDate = unpaidPayments[0]?.dueDate || null;

      const daysOverdue = nextDueDate
        ? Math.max(
            0,
            Math.floor(
              (now.getTime() - new Date(nextDueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 0;

      const feeName =
        payments.length > 0
          ? payments.map((p) => p.fee?.name || 'Fee').join(', ')
          : '—';

      let computedStatus:
        | 'PAID'
        | 'PARTIAL'
        | 'UNPAID'
        | 'NO_FEE' = 'NO_FEE';
      if (payments.length === 0) computedStatus = 'NO_FEE';
      else if (totalFee > 0 && dueAmount === 0) computedStatus = 'PAID';
      else if (paidAmount > 0) computedStatus = 'PARTIAL';
      else computedStatus = 'UNPAID';

      let escalation: 'REMINDER_1' | 'REMINDER_2' | 'FINAL_NOTICE';
      if (daysOverdue <= 7) escalation = 'REMINDER_1';
      else if (daysOverdue <= 15) escalation = 'REMINDER_2';
      else escalation = 'FINAL_NOTICE';

      const rowId = payments[0]?.id ?? `student-${s.id}`;

      return {
        id: rowId,
        receiptNo: payments[0]?.receiptNo ?? null,
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName || ''}`.trim(),
        admissionNo: s.admissionNo,
        rollNumber: s.rollNumber,
        classId: s.classId,
        className: s.class?.name || '',
        sectionName: s.section?.name || '',
        guardianMobile: s.guardianMobile,
        feeName,
        totalFee,
        paidAmount,
        dueAmount,
        dueDate: nextDueDate,
        daysOverdue,
        escalation,
        status: computedStatus,
      };
    });

    /* POST-QUERY FILTERS */
    if (paymentStatus && paymentStatus !== 'all') {
      if (paymentStatus === 'unpaid') {
        rows = rows.filter(
          (r) => r.status === 'UNPAID' || r.status === 'NO_FEE'
        );
      } else if (paymentStatus === 'partial') {
        rows = rows.filter((r) => r.status === 'PARTIAL');
      } else if (paymentStatus === 'paid') {
        rows = rows.filter((r) => r.status === 'PAID');
      }
    }

    if (overdueFilter && overdueFilter !== 'all') {
      if (overdueFilter === '0-3') {
        rows = rows.filter(
          (r) => r.daysOverdue >= 0 && r.daysOverdue <= 3
        );
      } else if (overdueFilter === '4-7') {
        rows = rows.filter(
          (r) => r.daysOverdue >= 4 && r.daysOverdue <= 7
        );
      } else if (overdueFilter === '8-30') {
        rows = rows.filter(
          (r) => r.daysOverdue >= 8 && r.daysOverdue <= 30
        );
      } else if (overdueFilter === '30+') {
        rows = rows.filter((r) => r.daysOverdue > 30);
      }
    }

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ============================================================
     ✅ DEFAULTER STATS — counts ALL active students
     ============================================================ */
  static async getDefaulterStats(tenantId: string) {
    const now = new Date();

    const students = await prisma.student.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        feePayments: {
          select: {
            amount: true,
            paidAmount: true,
            dueDate: true,
          },
        },
      },
    });

    let totalDue = 0;
    let criticalCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;
    let paidCount = 0;

    for (const s of students) {
      const payments = s.feePayments || [];
      const totalFee = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const paid = payments.reduce(
        (sum, p) => sum + Number(p.paidAmount),
        0
      );
      const due = Math.max(0, totalFee - paid);

      if (due > 0) totalDue += due;

      if (payments.length === 0) {
        unpaidCount++;
      } else if (paid <= 0) {
        unpaidCount++;
      } else if (due > 0) {
        partialCount++;
      } else {
        paidCount++;
      }

      const hasCritical = payments.some((p) => {
        if (!p.dueDate) return false;
        const owed = Number(p.amount) - Number(p.paidAmount);
        if (owed <= 0) return false;
        const days = Math.floor(
          (now.getTime() - new Date(p.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return days > 30;
      });
      if (hasCritical) criticalCount++;
    }

    return {
      totalDefaulters: students.length,
      totalDue,
      criticalCount,
      uniqueStudents: students.length,
      unpaidCount,
      partialCount,
      paidCount,
      contactedCount: 0,
      recoveredCount: paidCount,
    };
  }

  /* ============================================================
     BULK SEND REMINDERS (stub)
     ============================================================ */
  static async sendBulkReminders(
    tenantId: string,
    feePaymentIds: string[],
    channel: 'SMS' | 'EMAIL' | 'BOTH'
  ) {
    if (!feePaymentIds || feePaymentIds.length === 0) {
      throw new AppError(400, 'No defaulters selected');
    }

    const rows = await prisma.feePayment.findMany({
      where: {
        tenantId,
        id: { in: feePaymentIds },
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            guardianMobile: true,
          },
        },
        fee: { select: { name: true } },
      },
    });

    console.log(
      `[sendBulkReminders] Sending ${channel} to ${rows.length} defaulters`
    );

    return {
      sent: rows.length,
      channel,
      message: `Sent ${rows.length} reminder(s) via ${channel}`,
    };
  }
}