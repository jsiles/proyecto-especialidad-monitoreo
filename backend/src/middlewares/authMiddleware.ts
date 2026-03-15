/**
 * Authentication Middleware
 * JWT validation and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { verifyToken, TokenPayload } from '../utils/jwtUtils';
import { logger } from '../utils/logger';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    // Check Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
    }

    const token = parts[1];

    // Verify token
    const payload = await verifyToken(token);
    req.user = payload;

    logger.debug('User authenticated', {
      userId: payload.userId,
      username: payload.username,
    });

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
};

/**
 * Middleware to check if user has required roles
 */
export const authorize = (...requiredRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      logger.warn('Authorization failed', {
        userId: req.user.userId,
        requiredRoles,
        userRoles,
      });
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const payload = await verifyToken(token);
        req.user = payload;
      }
    }

    next();
  } catch {
    // Ignore errors for optional auth
    next();
  }
};

export default { authenticate, authorize, optionalAuth };
