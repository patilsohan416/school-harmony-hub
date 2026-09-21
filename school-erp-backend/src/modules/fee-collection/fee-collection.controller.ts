import { Response, NextFunction } from 'express';
import { FeeCollectionService } from './fee-collection.service';
import { AuthRequest } from '../../middleware/auth';

// Fee Setup
export const listFees = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FeeCollectionService.listFees(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createFee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FeeCollectionService.createFee(req.user!.tenantId!, req.body);
    res.json({ success: true, message: 'Fee created', data });
  } catch (error) { next(error); }
};

export const updateFee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FeeCollectionService.updateFee(req.user!.tenantId!, req.params.id, req.body);
    res.json({ success: true, message: 'Fee updated', data });
  } catch (error) { next(error); }
};

export const deleteFee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await FeeCollectionService.deleteFee(req.user!.tenantId!, req.params.id);
    res.json({ success: true, message: 'Fee deleted' });
  } catch (error) { next(error); }
};

export const getClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FeeCollectionService.getClasses(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const assignFeeToStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FeeCollectionService.assignFeeToStudents(req.user!.tenantId!, req.params.id, req.body.dueDate);
    res.json({ success: true, message: data.message, data });
  } catch (error) { next(error); }
};

// Collection
export const searchStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || '';
    const data = await FeeCollectionService.searchStudentsForCollection(req.user!.tenantId!, q);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getOutstandingFees = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FeeCollectionService.getStudentOutstandingFees(req.user!.tenantId!, req.params.studentId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const collectPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FeeCollectionService.collectPayment(req.user!.tenantId!, req.body);
    res.json({ success: true, message: 'Payment collected successfully', data });
  } catch (error) { next(error); }
};

export const listCollections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = (req.query.search as string) || '';
    const data = await FeeCollectionService.listCollections(req.user!.tenantId!, { page, limit, search });
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
};

// Dashboard
export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FeeCollectionService.getDashboard(req.user!.tenantId!);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};