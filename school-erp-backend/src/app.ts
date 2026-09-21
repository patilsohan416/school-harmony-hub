import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';

import { authRoutes } from './modules/auth/auth.routes';
import { studentRoutes } from './modules/students/student.routes';
import { genericRoutes } from './modules/generic/generic.routes';
import { classRoutes } from './modules/classes/class.routes';
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { marksRoutes } from './modules/marks/marks.routes';
import { teacherRoutes } from './modules/teachers/teacher.routes';
import { publicAdmissionRoutes } from './modules/admission/admission.routes';
import { icseMarksRoutes } from './modules/icse-marks/icse-marks.routes';
import { cbseMarksRoutes } from './modules/cbse-marks/cbse-marks.routes';
import { progressReportRoutes } from './modules/progress-report/progress-report.routes';
import { inventoryRoutes } from './modules/inventory/inventory.routes';
import { staffRoutes } from './modules/staff/staff.routes';
import { stockInRoutes } from './modules/stockin/stockin.routes';
import { supplierRoutes } from './modules/supplier/supplier.routes';
import { inventoryReportRoutes } from './modules/inventory-report/inventory-report.routes';
import { staffIDCardRoutes } from './modules/staff-id-card/staff-id-card.routes';
import { timetableRoutes } from './modules/timetable/timetable.routes';
import { studyMaterialRoutes } from './modules/study-material/study-material.routes';
import { accountantRoutes } from './modules/accountant/accountant.routes';
import { feeCollectionRoutes } from './modules/fee-collection/fee-collection.routes';

dotenv.config();

const app = express();

// ============================================
// Rate Limiting
// ============================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// ============================================
// CORS Middleware
// ============================================

app.use(
  (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin || '*';

    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,PATCH,OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, X-Requested-With'
    );
    res.header('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  }
);

app.use(
  cors({
    origin: [
      'http://localhost:8080',
      'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    contentSecurityPolicy: false,
  })
);

app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/api', limiter);

app.use('/uploads', express.static('uploads'));

// ============================================
// PUBLIC ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/public/admission', publicAdmissionRoutes);

// ============================================
// PROTECTED ROUTES
// ============================================

app.use('/api/students', authenticate, studentRoutes);
app.use('/api/classes', authenticate, classRoutes);
app.use('/api/teachers', authenticate, teacherRoutes);
app.use('/api/staff', authenticate, staffRoutes);

app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/marks', authenticate, marksRoutes);
app.use('/api/progress-report', authenticate, progressReportRoutes);

app.use('/api/icse-marks', authenticate, icseMarksRoutes);
app.use('/api/cbse-marks', authenticate, cbseMarksRoutes);

app.use('/api/inventory', authenticate, inventoryRoutes);
app.use('/api/stock-in', authenticate, stockInRoutes);
app.use('/api/suppliers', authenticate, supplierRoutes);
app.use('/api/inventory-reports', authenticate, inventoryReportRoutes);

app.use('/api/staff-id-card', staffIDCardRoutes);

app.use('/api/timetable', authenticate, timetableRoutes);
app.use('/api/study-material', authenticate, studyMaterialRoutes);

// Accountant (dashboard, collect-payment, collections, etc.)
app.use('/api/accountant', accountantRoutes);

// Fee Collection (fees CRUD, assign to students)
app.use('/api/fee-collection', feeCollectionRoutes);

app.use('/api/generic', authenticate, genericRoutes);

// ============================================
// Health Check
// ============================================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================
// 404 Handler
// ============================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

export default app;