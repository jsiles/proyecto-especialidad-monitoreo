/**
 * Authentication Service
 * Business logic for authentication operations
 */

import { userRepository } from '../repositories/UserRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { hashPassword, comparePassword } from '../utils/passwordHasher';
import { generateToken, verifyToken } from '../utils/jwtUtils';
import { LoginDTO, RegisterDTO, AuthResponseDTO, ChangePasswordDTO, TokenPayloadDTO, UpdateProfileDTO } from '../dtos/AuthDTO';
import { SafeUser } from '../models/User';
import { logger } from '../utils/logger';
import { UnauthorizedError, BadRequestError, ConflictError } from '../middlewares/errorHandler';

export class AuthService {
  /**
   * Login user with username and password
   */
  public async login(credentials: LoginDTO, ipAddress?: string): Promise<AuthResponseDTO> {
    const { username, password } = credentials;

    // Find user
    const user = userRepository.findByUsernameWithRoles(username);
    if (!user) {
      // Log failed attempt
      auditLogRepository.create({
        action: 'LOGIN_FAILED',
        details: { username, reason: 'User not found' },
        ip_address: ipAddress,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      auditLogRepository.create({
        user_id: user.id,
        action: 'LOGIN_FAILED',
        details: { reason: 'Invalid password' },
        ip_address: ipAddress,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    userRepository.updateLastLogin(user.id);

    // Get roles
    const roles = user.roles.map(r => r.name);

    // Generate token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email || '',
      roles,
    };
    const token = generateToken(tokenPayload);

    // Log successful login
    auditLogRepository.create({
      user_id: user.id,
      action: 'LOGIN',
      details: { username },
      ip_address: ipAddress,
    });

    logger.info('User logged in', { userId: user.id, username });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles,
      },
      expiresIn: process.env.JWT_EXPIRATION || '24h',
    };
  }

  /**
   * Register new user
   */
  public async register(data: RegisterDTO, ipAddress?: string): Promise<SafeUser> {
    const { username, password, email } = data;

    // Check if username exists
    if (userRepository.usernameExists(username)) {
      throw new ConflictError('Username already exists');
    }

    // Check if email exists
    if (email && userRepository.findByEmail(email)) {
      throw new ConflictError('Email already in use');
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user with default operator role
    const user = userRepository.create({
      username,
      password: password, // Required by interface but we pass hash separately
      password_hash,
      email,
      roles: ['role-operator'], // Default role
    });

    // Log registration
    auditLogRepository.create({
      user_id: user.id,
      action: 'USER_CREATED',
      details: { username, email },
      ip_address: ipAddress,
    });

    logger.info('User registered', { userId: user.id, username });

    return userRepository.toSafeUser(user);
  }

  /**
   * Verify JWT token
   */
  public async validateToken(token: string): Promise<TokenPayloadDTO | null> {
    try {
      const payload = await verifyToken(token);
      return {
        userId: payload.userId,
        username: payload.username,
        roles: payload.roles,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Change user password
   */
  public async changePassword(
    userId: string,
    data: ChangePasswordDTO,
    ipAddress?: string
  ): Promise<void> {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Verify current password
    const isValid = await comparePassword(data.currentPassword, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const password_hash = await hashPassword(data.newPassword);

    // Update password
    userRepository.update(userId, { password_hash });

    // Log password change
    auditLogRepository.create({
      user_id: userId,
      action: 'PASSWORD_CHANGED',
      ip_address: ipAddress,
    });

    logger.info('Password changed', { userId });
  }

  /**
   * Update current user profile
   */
  public updateProfile(
    userId: string,
    data: UpdateProfileDTO,
    ipAddress?: string
  ): SafeUser {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    if (data.username !== user.username && userRepository.usernameExists(data.username)) {
      throw new ConflictError('Username already exists');
    }

    if (data.email && data.email !== user.email) {
      const existingByEmail = userRepository.findByEmail(data.email);
      if (existingByEmail && existingByEmail.id !== userId) {
        throw new ConflictError('Email already in use');
      }
    }

    const updatedUser = userRepository.update(userId, {
      username: data.username,
      email: data.email,
    });

    auditLogRepository.create({
      user_id: userId,
      action: 'PROFILE_UPDATED',
      details: { username: data.username, email: data.email || null },
      ip_address: ipAddress,
    });

    logger.info('User profile updated', { userId });

    return userRepository.toSafeUser(updatedUser!);
  }

  /**
   * Get user profile
   */
  public getProfile(userId: string): SafeUser | null {
    const user = userRepository.findById(userId);
    if (!user) return null;
    return userRepository.toSafeUser(user);
  }

  /**
   * Logout (for audit purposes)
   */
  public logout(userId: string, ipAddress?: string): void {
    auditLogRepository.create({
      user_id: userId,
      action: 'LOGOUT',
      ip_address: ipAddress,
    });
    logger.info('User logged out', { userId });
  }
}

export const authService = new AuthService();
export default authService;
