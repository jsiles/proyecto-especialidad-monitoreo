/**
 * JWT Utilities
 * Token generation and verification
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { logger } from './logger';

// Token payload interface
export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

// Get JWT secret from environment
const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

// Get token expiration from environment
const getExpiration = (): string => {
  return process.env.JWT_EXPIRATION || '1h';
};

/**
 * Generate a JWT token for a user
 */
export const generateToken = (payload: TokenPayload): string => {
  const secret = getSecret();
  const expiration = getExpiration();

  const token = jwt.sign(payload as object, secret, {
    expiresIn: expiration as jwt.SignOptions['expiresIn'],
    issuer: 'monitoring-platform',
    audience: 'monitoring-platform-users',
  });

  logger.debug('Token generated', { userId: payload.userId });

  return token;
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = async (token: string): Promise<TokenPayload> => {
  const secret = getSecret();

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      secret,
      {
        issuer: 'monitoring-platform',
        audience: 'monitoring-platform-users',
      },
      (err, decoded) => {
        if (err) {
          logger.debug('Token verification failed', { error: err.message });
          reject(err);
          return;
        }

        const payload = decoded as JwtPayload & TokenPayload;
        resolve({
          userId: payload.userId,
          username: payload.username,
          email: payload.email,
          roles: payload.roles,
        });
      }
    );
  });
};

/**
 * Decode a token without verification (useful for expired tokens)
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload & TokenPayload;
    if (!decoded) return null;

    return {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      roles: decoded.roles,
    };
  } catch {
    return null;
  }
};

/**
 * Generate a refresh token (longer expiration)
 */
export const generateRefreshToken = (userId: string): string => {
  const secret = getSecret();

  return jwt.sign(
    { userId, type: 'refresh' },
    secret,
    {
      expiresIn: '7d',
      issuer: 'monitoring-platform',
    }
  );
};

export default { generateToken, verifyToken, decodeToken, generateRefreshToken };
