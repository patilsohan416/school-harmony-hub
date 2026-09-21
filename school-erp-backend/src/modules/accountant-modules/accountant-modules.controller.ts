import { Response, NextFunction } from 'express';
import { AccountantModulesService } from './accountant-modules.service';
import { AuthRequest } from '../../middleware/auth';

export const getAuditLog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AccountantModulesService.getAuditLog(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getBankAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AccountantModulesService.getBankAccounts(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getDefaulters = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AccountantModulesService.getDefaulters(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getDiscounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AccountantModulesService.getDiscounts(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AccountantModulesService.getExpenses(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AccountantModulesService.createExpense(req.user!.tenantId!, req.user!.id, req.body);
    res.json({ success: true, message: 'Expense recorded', data });
  } catch (error) { next(error); }
};

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AccountantModulesService.getNotifications(req.user!.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};