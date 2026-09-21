import prisma from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';

export class AuthService {
  static async login(data: { 
    email: string; 
    password: string; 
    role?: string; 
    ip?: string 
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: { tenant: true }
      });

      if (!user) {
        logger.warn(`[LOGIN DEBUG] No user found for email: ${data.email}`);
        throw new AppError(401, 'Invalid credentials');
      }

      // Convert both to uppercase for comparison
      const requestedRole = data.role?.toUpperCase();
      const userRole = user.role.toUpperCase();

      // If role is provided, check if user has that role
      if (requestedRole && userRole !== requestedRole) {
        logger.warn(`[LOGIN DEBUG] Role mismatch for ${data.email}: stored role = ${userRole}, requested role = ${requestedRole}`);
        throw new AppError(403, `You don't have ${requestedRole} access. Please select correct role.`);
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        logger.warn(`[LOGIN DEBUG] Password mismatch for ${data.email}`);
        throw new AppError(401, 'Invalid credentials');
      }

      if (!user.isActive) {
        logger.warn(`[LOGIN DEBUG] Account inactive for ${data.email}`);
        throw new AppError(403, 'Account is deactivated');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          lastLoginIP: data.ip
        }
      });

      // Generate tokens
      const accessToken = AuthService.generateAccessToken(user.id, user.role);
      const refreshToken = AuthService.generateRefreshToken(user.id);

      // Store refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
      });

      // Log audit
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'LOGIN',
            module: 'auth',
            entity: 'user',
            entityId: user.id,
            newData: { login: true }
          }
        });
      } catch (auditError) {
        logger.warn('Audit log creation failed:', auditError);
      }

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions,
          tenant: user.tenant
        }
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  static async register(data: any) {
    try {
      const existing = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existing) {
        throw new AppError(400, 'User already exists');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role || 'USER',
          permissions: data.permissions || [],
          tenantId: data.tenantId,
          isActive: true
        }
      });

      const accessToken = AuthService.generateAccessToken(user.id, user.role);
      const refreshToken = AuthService.generateRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      };
    } catch (error) {
      logger.error('Register error:', error);
      throw error;
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) {
        throw new AppError(500, 'JWT_REFRESH_SECRET is not configured');
      }
      
      const decoded = jwt.verify(refreshToken, secret) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new AppError(401, 'Invalid refresh token');
      }

      const newAccessToken = AuthService.generateAccessToken(user.id, user.role);
      const newRefreshToken = AuthService.generateRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken }
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new AppError(401, 'Invalid refresh token');
    }
  }

  static async logout(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null }
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGOUT',
          module: 'auth',
          entity: 'user',
          entityId: userId,
          newData: { logout: true }
        }
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  static async getMe(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenant: true,
        }
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      return user;
    } catch (error) {
      logger.error('GetMe error:', error);
      throw error;
    }
  }

  static async changePassword(userId: string, data: {
    currentPassword: string;
    newPassword: string;
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      const isValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValid) {
        throw new AppError(401, 'Current password is incorrect');
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
    } catch (error) {
      logger.error('ChangePassword error:', error);
      throw error;
    }
  }

  static async forgotPassword(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return;
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry
        }
      });

      logger.info(`Password reset token for ${email}: ${resetToken}`);
      return resetToken;
    } catch (error) {
      logger.error('ForgotPassword error:', error);
      throw error;
    }
  }

  static async resetPassword(data: { token: string; newPassword: string }) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          resetToken: data.token,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new AppError(400, 'Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });
    } catch (error) {
      logger.error('ResetPassword error:', error);
      throw error;
    }
  }

  private static generateAccessToken(userId: string, role: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
   
    return jwt.sign(
      { userId, role },
      secret,
      
    );
  }

  private static generateRefreshToken(userId: string) {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }
    const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
    return jwt.sign(
      { userId },
      secret,
      { expiresIn }
    );
  }
}