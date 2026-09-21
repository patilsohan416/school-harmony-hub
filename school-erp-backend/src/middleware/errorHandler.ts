import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../lib/logger';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    // @ts-ignore
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry',
        // @ts-ignore
        field: err.meta?.target,
      });
    }
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
