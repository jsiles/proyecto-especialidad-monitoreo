/**
 * Unit Tests - AuthService
 * Todas las dependencias (repositorios, utils) están mockeadas.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/repositories/UserRepository', () => ({
  userRepository: {
    findByUsernameWithRoles: jest.fn(),
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    usernameExists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateLastLogin: jest.fn(),
    toSafeUser: jest.fn((u: any) => {
      const { password_hash, ...safe } = u;
      return safe;
    }),
  },
}));

jest.mock('../src/repositories/AuditLogRepository', () => ({
  auditLogRepository: {
    create: jest.fn(),
  },
}));

jest.mock('../src/utils/passwordHasher', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('../src/utils/jwtUtils', () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { AuthService } from '../src/services/AuthService';
import { userRepository } from '../src/repositories/UserRepository';
import { hashPassword, comparePassword } from '../src/utils/passwordHasher';
import { generateToken, verifyToken } from '../src/utils/jwtUtils';

const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;
const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const adminUser = {
  id: 'user-1',
  username: 'admin',
  password_hash: 'hashed_pw',
  email: 'admin@test.com',
  roles: [{ id: 'role-1', name: 'ADMIN' }],
  created_at: new Date().toISOString(),
  last_login: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService (unit)', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  // ─── login ──────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token and user data on valid credentials', async () => {
      mockUserRepo.findByUsernameWithRoles.mockReturnValue(adminUser as any);
      mockComparePassword.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue('signed-token');

      const result = await service.login({ username: 'admin', password: 'admin123' });

      expect(result.token).toBe('signed-token');
      expect(result.user.username).toBe('admin');
      expect(result.user.roles).toEqual(['ADMIN']);
      expect(mockUserRepo.updateLastLogin).toHaveBeenCalledWith('user-1');
    });

    it('throws UnauthorizedError when user does not exist', async () => {
      mockUserRepo.findByUsernameWithRoles.mockReturnValue(null as any);

      await expect(service.login({ username: 'ghost', password: 'pass' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('throws UnauthorizedError on wrong password', async () => {
      mockUserRepo.findByUsernameWithRoles.mockReturnValue(adminUser as any);
      mockComparePassword.mockResolvedValue(false);

      await expect(service.login({ username: 'admin', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('includes ipAddress in audit log', async () => {
      const { auditLogRepository } = require('../src/repositories/AuditLogRepository');
      mockUserRepo.findByUsernameWithRoles.mockReturnValue(adminUser as any);
      mockComparePassword.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue('t');

      await service.login({ username: 'admin', password: 'pw' }, '127.0.0.1');

      const calls = auditLogRepository.create.mock.calls;
      const loginCall = calls.find((c: any) => c[0].action === 'LOGIN');
      expect(loginCall[0].ip_address).toBe('127.0.0.1');
    });
  });

  // ─── register ───────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user and returns safe user on valid data', async () => {
      mockUserRepo.usernameExists.mockReturnValue(false);
      mockUserRepo.findByEmail.mockReturnValue(null as any);
      mockHashPassword.mockResolvedValue('hashed');
      mockUserRepo.create.mockReturnValue({ id: 'new-1', username: 'newuser' } as any);
      mockUserRepo.toSafeUser.mockReturnValue({ id: 'new-1', username: 'newuser' } as any);

      const result = await service.register({ username: 'newuser', password: 'Passw0rd!', email: 'new@test.com' });

      expect(result.username).toBe('newuser');
      expect(mockHashPassword).toHaveBeenCalledWith('Passw0rd!');
    });

    it('throws ConflictError when username already exists', async () => {
      mockUserRepo.usernameExists.mockReturnValue(true);

      await expect(service.register({ username: 'admin', password: 'Passw0rd!' }))
        .rejects.toThrow('Username already exists');
    });

    it('throws ConflictError when email already in use', async () => {
      mockUserRepo.usernameExists.mockReturnValue(false);
      mockUserRepo.findByEmail.mockReturnValue({ id: 'existing' } as any);

      await expect(service.register({ username: 'other', password: 'Passw0rd!', email: 'dup@test.com' }))
        .rejects.toThrow('Email already in use');
    });

    it('does not check email when email is not provided', async () => {
      mockUserRepo.usernameExists.mockReturnValue(false);
      mockHashPassword.mockResolvedValue('hashed');
      mockUserRepo.create.mockReturnValue({ id: 'u2', username: 'norole' } as any);
      mockUserRepo.toSafeUser.mockReturnValue({ id: 'u2', username: 'norole' } as any);

      await service.register({ username: 'norole', password: 'Passw0rd!' });

      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled();
    });
  });

  // ─── validateToken ──────────────────────────────────────────────────────

  describe('validateToken', () => {
    it('returns payload for valid token', async () => {
      mockVerifyToken.mockResolvedValue({ userId: 'user-1', username: 'admin', roles: ['ADMIN'] } as any);

      const result = await service.validateToken('valid.token');

      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-1');
      expect(result!.username).toBe('admin');
    });

    it('returns null for invalid/expired token', async () => {
      mockVerifyToken.mockRejectedValue(new Error('jwt expired'));

      const result = await service.validateToken('bad.token');

      expect(result).toBeNull();
    });
  });

  // ─── changePassword ──────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('updates password hash on valid current password', async () => {
      mockUserRepo.findById.mockReturnValue(adminUser as any);
      mockComparePassword.mockResolvedValue(true);
      mockHashPassword.mockResolvedValue('new_hash');

      await service.changePassword('user-1', { currentPassword: 'old', newPassword: 'NewPass1!' });

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { password_hash: 'new_hash' });
    });

    it('throws BadRequestError when user is not found', async () => {
      mockUserRepo.findById.mockReturnValue(null as any);

      await expect(service.changePassword('gone', { currentPassword: 'x', newPassword: 'y' }))
        .rejects.toThrow('User not found');
    });

    it('throws UnauthorizedError when current password is wrong', async () => {
      mockUserRepo.findById.mockReturnValue(adminUser as any);
      mockComparePassword.mockResolvedValue(false);

      await expect(service.changePassword('user-1', { currentPassword: 'wrong', newPassword: 'New1!' }))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  // ─── getProfile ──────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns safe user when user exists', () => {
      mockUserRepo.findById.mockReturnValue(adminUser as any);
      mockUserRepo.toSafeUser.mockReturnValue({ id: 'user-1', username: 'admin' } as any);

      const result = service.getProfile('user-1');

      expect(result).not.toBeNull();
      expect(result!.username).toBe('admin');
    });

    it('returns null when user does not exist', () => {
      mockUserRepo.findById.mockReturnValue(null as any);

      const result = service.getProfile('missing');

      expect(result).toBeNull();
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('creates LOGOUT audit log entry', () => {
      const { auditLogRepository } = require('../src/repositories/AuditLogRepository');

      service.logout('user-1', '10.0.0.1');

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT', user_id: 'user-1', ip_address: '10.0.0.1' })
      );
    });

    it('does not throw when ipAddress is omitted', () => {
      expect(() => service.logout('user-1')).not.toThrow();
    });
  });
});
