import { Response, NextFunction } from 'express';
import { AccountantService } from './accountant.service';
import { AuthRequest } from '../../middleware/auth';

/* ============================================================
   GET DASHBOARD
   ============================================================ */
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await AccountantService.getDashboard(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   SEARCH STUDENTS
   ============================================================ */
export const searchStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q = (req.query.q as string) || '';
    const data = await AccountantService.searchStudentsForCollection(
      req.user!.tenantId!,
      q
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   GET OUTSTANDING FEES
   ============================================================ */
export const getOutstandingFees = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await AccountantService.getStudentOutstandingFees(
      req.user!.tenantId!,
      req.params.studentId
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   GET FEE TYPES
   ============================================================ */
export const getFeeTypes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classId = (req.query.classId as string) || undefined;
    const data = await AccountantService.listFeeTypes(
      req.user!.tenantId!,
      classId
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   COLLECT PAYMENT
   ============================================================ */
export const collectPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('[collectPayment route] body:', req.body);

    const payment = await AccountantService.collectPayment(
      req.user!.tenantId!,
      req.body
    );

    res.json({
      success: true,
      message: 'Payment collected successfully',
      data: {
        id: payment.id,
        receiptNo:
          payment.receiptNo || payment.id.slice(0, 8).toUpperCase(),
        date: payment.paymentDate,
        studentId: payment.studentId,
        studentName: payment.student
          ? `${payment.student.firstName} ${
              payment.student.lastName || ''
            }`.trim()
          : undefined,
        feeName: payment.fee?.name,
        amountPaid: Number(payment.paidAmount),
        totalAmount: Number(payment.amount),
        status: payment.status,
        paymentMethod: payment.paymentMethod,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   LIST COLLECTIONS
   ============================================================ */
export const listCollections = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = (req.query.search as string) || '';
    const data = await AccountantService.listCollections(
      req.user!.tenantId!,
      { page, limit, search }
    );
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   LIST RECEIPTS
   ============================================================ */
export const listReceipts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = (req.query.search as string) || '';
    const from = (req.query.from as string) || undefined;
    const to = (req.query.to as string) || undefined;
    const method = (req.query.method as string) || 'all';
    const classId = (req.query.classId as string) || 'all';

    const data = await AccountantService.listReceipts(req.user!.tenantId!, {
      page,
      limit,
      search,
      from,
      to,
      method,
      classId,
    });
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   GET SINGLE RECEIPT
   ============================================================ */
export const getReceipt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const receipt = await AccountantService.getReceiptById(
      req.user!.tenantId!,
      req.params.id
    );

    if (!receipt) {
      res.status(404).json({
        success: false,
        message: 'Receipt not found',
      });
      return;
    }

    res.json({ success: true, data: receipt });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

/* ============================================================
   RECEIPT STATS
   ============================================================ */
export const getReceiptStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await AccountantService.getReceiptStats(
      req.user!.tenantId!
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   LIST PENDING FEES
   ============================================================ */
export const listPendingFees = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = (req.query.search as string) || '';
    const classId = (req.query.classId as string) || 'all';
    const status = (req.query.status as string) || 'all';
    const dueFilter = (req.query.dueFilter as string) || 'all';

    const data = await AccountantService.listPendingFees(
      req.user!.tenantId!,
      { page, limit, search, classId, status, dueFilter }
    );
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   PENDING FEE STATS
   ============================================================ */
export const getPendingFeeStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await AccountantService.getPendingFeeStats(
      req.user!.tenantId!
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   UPDATE PENDING FEE AMOUNT
   ============================================================ */
export const updatePendingFeeAmount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { totalFee } = req.body;

    if (!totalFee || Number(totalFee) <= 0) {
      res.status(400).json({
        success: false,
        message: 'Total fee must be greater than 0',
      });
      return;
    }

    const data = await AccountantService.updatePendingFeeAmount(
      req.user!.tenantId!,
      id,
      Number(totalFee)
    );

    res.json({
      success: true,
      message: 'Total fee updated successfully',
      data,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

/* ============================================================
   GET CLASSES WITH SECTIONS
   ============================================================ */
export const getClassesWithSections = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await AccountantService.getClassesWithSections(
      req.user!.tenantId!
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   GET SECTIONS FOR A CLASS (for dropdown)
   ============================================================ */
export const getSectionsForClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const className = (req.query.className as string) || '';
    if (!className) {
      res.json({ success: true, data: [] });
      return;
    }
    const data = await AccountantService.getSectionsForClass(
      req.user!.tenantId!,
      className
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   CLASS-WISE STUDENT FEE LIST
   ============================================================ */
export const getClassWiseStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classId = (req.query.classId as string) || 'all';
    const sectionId = (req.query.sectionId as string) || 'all';
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || 'all';

    const data = await AccountantService.getClassWiseStudents(
      req.user!.tenantId!,
      { classId, sectionId, search, status }
    );
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   UPDATE STUDENT TOTAL FEE
   ============================================================ */
export const updateStudentTotalFee = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { totalFee } = req.body;

    if (!totalFee || Number(totalFee) <= 0) {
      res.status(400).json({
        success: false,
        message: 'Total fee must be greater than 0',
      });
      return;
    }

    const data = await AccountantService.updateStudentTotalFee(
      req.user!.tenantId!,
      studentId,
      Number(totalFee)
    );

    res.json({
      success: true,
      message: 'Total fee updated',
      data,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

/* ============================================================
   LIST DEFAULTERS
   Passes sectionId + paymentStatus
   ============================================================ */
export const listDefaulters = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const search = (req.query.search as string) || '';
    const classId = (req.query.classId as string) || 'all';
    const sectionId = (req.query.sectionId as string) || 'all';
    const paymentStatus = (req.query.paymentStatus as string) || 'all';
    const overdueFilter = (req.query.overdueFilter as string) || 'all';
    const sortBy = (req.query.sortBy as string) || 'days-desc';

    const data = await AccountantService.listDefaulters(
      req.user!.tenantId!,
      {
        page,
        limit,
        search,
        classId,
        sectionId,
        paymentStatus,
        overdueFilter,
        sortBy,
      }
    );
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   DEFAULTER STATS
   ============================================================ */
export const getDefaulterStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await AccountantService.getDefaulterStats(
      req.user!.tenantId!
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   SEND BULK REMINDERS
   ============================================================ */
export const sendBulkReminders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { feePaymentIds, channel } = req.body;

    if (!Array.isArray(feePaymentIds) || feePaymentIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No defaulters selected',
      });
      return;
    }

    const data = await AccountantService.sendBulkReminders(
      req.user!.tenantId!,
      feePaymentIds,
      channel || 'SMS'
    );

    res.json({ success: true, ...data });
    return;
  } catch (error) {
    next(error);
    return;
  }
};