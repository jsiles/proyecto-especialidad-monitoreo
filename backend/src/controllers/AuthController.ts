/**
 * Authentication Controller
 * Handles user authentication operations
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { validateLoginDTO, validateRegisterDTO, validateChangePasswordDTO } from '../dtos/AuthDTO';

export class AuthController {
  /**
   * Login user
   * POST /api/auth/login
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input (throws if invalid)
      const credentials = validateLoginDTO(req.body);

      // Perform login
      const result = await authService.login(credentials, req.ip);

      res.json({
        success: true,
        data: {
          token: result.token,
          user: result.user,
          expiresIn: result.expiresIn,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Register new user
   * POST /api/auth/register
   */
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input (throws if invalid)
      const registerData = validateRegisterDTO(req.body);

      // Perform registration
      const user = await authService.register(registerData, req.ip);

      res.status(201).json({
        success: true,
        data: { user },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify JWT token
   * GET /api/auth/verify
   */
  public verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({
        success: true,
        data: {
          valid: true,
          user: req.user,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user
   * POST /api/auth/logout
   */
  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.userId) {
        authService.logout(req.user.userId, req.ip);
      }

      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change password
   * POST /api/auth/change-password
   */
  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input (throws if invalid)
      const changeData = validateChangePasswordDTO(req.body);

      // Change password
      await authService.changePassword(req.user!.userId, changeData, req.ip);

      res.json({
        success: true,
        data: { message: 'Password changed successfully' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user info
   * GET /api/auth/me
   */
  public getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = authService.getProfile(req.user!.userId);
      
      res.json({
        success: true,
        data: { user },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
