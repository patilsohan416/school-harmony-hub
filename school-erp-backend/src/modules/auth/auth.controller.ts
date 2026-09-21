import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { 
  LoginSchema, 
  RegisterSchema, 
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RefreshTokenSchema
} from './auth.validation';
import { AuthRequest } from '../../middleware/auth';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ Now accepts role from frontend
    const data = LoginSchema.parse(req.body);
    const result = await AuthService.login({
      email: data.email,
      password: data.password,
      role: data.role, // ✅ Role sent from frontend
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const result = await AuthService.register(data);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    const result = await AuthService.refreshToken(refreshToken);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await AuthService.logout(req.user!.id);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await AuthService.getMe(req.user!.id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = ChangePasswordSchema.parse(req.body);
    await AuthService.changePassword(req.user!.id, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await AuthService.forgotPassword(email);
    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = ResetPasswordSchema.parse(req.body);
    await AuthService.resetPassword({
      token: data.token,
      newPassword: data.newPassword
    });
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};