import { Response, NextFunction } from "express";
import { StudentService } from "./student.service";
import {
  CreateStudentSchema,
  UpdateStudentSchema,
  GetStudentsQuerySchema,
} from "./student.validation";
import { AuthRequest } from "../../middleware/auth";

const DEFAULT_TENANT_ID = "79896939-b3c3-48ff-bb3d-89048d985620";
const DEFAULT_USER_ID = "SYSTEM";

export const getStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = GetStudentsQuerySchema.parse(req.query);

    const result = await StudentService.getStudents({
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      ...query,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const student = await StudentService.getStudent(req.params.id);

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentByAdmissionNo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const student = await StudentService.getStudentByAdmissionNo(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      req.params.admissionNo
    );

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentByRollNumber = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sectionId, rollNumber } = req.query as { sectionId?: string; rollNumber?: string };

    if (!sectionId || !rollNumber) {
      res.status(400).json({ success: false, message: 'sectionId and rollNumber are required' });
      return;
    }

    const student = await StudentService.getStudentByRollNumber(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      sectionId,
      Number(rollNumber)
    );

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = CreateStudentSchema.parse(req.body);

    const file = (req as any).file as Express.Multer.File | undefined;
    const profileImage = file ? `/uploads/students/${file.filename}` : undefined;

    console.log("========== CREATE STUDENT ==========");
    console.log("REQUEST BODY:", req.body);

    const student = await StudentService.createStudent({
      ...data,
      profileImage,
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      createdBy: req.user?.id || DEFAULT_USER_ID,
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = UpdateStudentSchema.parse(req.body);

    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
      (data as any).profileImage = `/uploads/students/${file.filename}`;
    }

    const student = await StudentService.updateStudent(
      req.params.id,
      data,
      req.user?.id || DEFAULT_USER_ID
    );

    res.json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await StudentService.deleteStudent(
      req.params.id,
      req.user?.id || DEFAULT_USER_ID
    );

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await StudentService.getStudentStatistics(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getNextRollNumber = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, sectionId } = req.query as { classId?: string; sectionId?: string };

    if (!classId || !sectionId) {
      res.status(400).json({
        success: false,
        message: 'classId and sectionId are required'
      });
      return;
    }

    const nextRollNumber = await StudentService.getNextRollNumber(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      classId,
      sectionId
    );

    res.json({
      success: true,
      data: {
        nextRollNumber,
      },
    });
  } catch (error) {
    console.error('❌ Error in getNextRollNumber:', error);
    next(error);
  }
};

export const getMyDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await StudentService.getMyDashboardData(
      req.user.tenantId || DEFAULT_TENANT_ID,
      req.user.id
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error in getMyDashboard:', error);
    next(error);
  }
};

export const getMyResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const data = await StudentService.getMyResults(
      req.user.tenantId || DEFAULT_TENANT_ID,
      req.user.id
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error in getMyResults:', error);
    next(error);
  }
};