import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
    permissions: string[];
  };
}
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    console.log("========== AUTH MIDDLEWARE ==========");

    const authHeader = req.headers.authorization;
    console.log("Authorization Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "No token provided");
    }

    const token = authHeader.split(" ")[1];
    console.log("Token:", token);

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError(500, "JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, secret) as any;
    console.log("Decoded Token:", decoded);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      include: {
        tenant: true,
      },
    });

    console.log("Database User:", user);

    if (!user) {
      throw new AppError(401, "User not found");
    }

    if (!user.isActive) {
      throw new AppError(401, "User account is deactivated");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
      permissions: (user.permissions as string[]) ?? [],
    };

    console.log("req.user:", req.user);
    console.log("====================================");

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);

    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, "Invalid token"));
    } else {
      next(error);
    }
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'Insufficient permissions');
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const permissions = req.user.permissions || [];
    if (!permissions.includes(permission)) {
      throw new AppError(403, 'Insufficient permissions');
    }

    next();
  };
};