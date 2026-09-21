import { Response, NextFunction } from "express";
import { PayrollService } from "./payroll.service";
import { AuthRequest } from "../../middleware/auth";

const DEFAULT_TENANT_ID = "79896939-b3c3-48ff-bb3d-89048d985620";

export const getPayrollList = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const search = req.query.search as string | undefined;
    const month = req.query.month as string | undefined;

    const result = await PayrollService.getPayrollList({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      page,
      limit,
      search,
      month,
    });

    res.json({ success: true, ...result });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

export const createPayroll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId, month, grossAmount, deductions, remarks } = req.body;

    if (!staffId || !month || grossAmount === undefined) {
      res.status(400).json({
        success: false,
        message: "staffId, month, and grossAmount are required",
      });
      return;
    }

    const record = await PayrollService.createPayroll({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      staffId,
      month,
      grossAmount: Number(grossAmount),
      deductions: deductions !== undefined ? Number(deductions) : undefined,
      remarks,
    });

    res.status(201).json({
      success: true,
      message: "Payroll record created successfully",
      data: record,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

export const updatePayroll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { month, grossAmount, deductions, remarks } = req.body;

    const record = await PayrollService.updatePayroll(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID,
      {
        month,
        grossAmount: grossAmount !== undefined ? Number(grossAmount) : undefined,
        deductions: deductions !== undefined ? Number(deductions) : undefined,
        remarks,
      }
    );

    res.json({
      success: true,
      message: "Payroll record updated successfully",
      data: record,
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
};

export const deletePayroll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await PayrollService.deletePayroll(
      req.params.id,
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({ success: true, message: "Payroll record deleted successfully" });
    return;
  } catch (error) {
    next(error);
    return;
  }
};