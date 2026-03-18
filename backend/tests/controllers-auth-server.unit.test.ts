/**
 * Unit Tests - AuthController & ServerController
 * All service and DTO validator dependencies mocked.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/services/AuthService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

jest.mock('../src/dtos/AuthDTO', () => ({
  validateLoginDTO: jest.fn((body) => body),
  validateRegisterDTO: jest.fn((body) => body),
  validateChangePasswordDTO: jest.fn((body) => body),
  validateUpdateProfileDTO: jest.fn((body) => body),
}));

jest.mock('../src/services/ServerService', () => ({
  serverService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getStatus: jest.fn(),
    getStatistics: jest.fn(),
  },
}));

jest.mock('../src/services/MonitoringService', () => ({
  monitoringService: {
    getServerMetrics: jest.fn(),
  },
}));

jest.mock('../src/dtos/ServerDTO', () => ({
  validateCreateServerDTO: jest.fn((body) => body),
  validateUpdateServerDTO: jest.fn((body) => body),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { AuthController } from '../src/controllers/AuthController';
import { ServerController } from '../src/controllers/ServerController';
import { authService } from '../src/services/AuthService';
import { serverService } from '../src/services/ServerService';
import { monitoringService } from '../src/services/MonitoringService';
import { validateLoginDTO, validateRegisterDTO, validateChangePasswordDTO, validateUpdateProfileDTO } from '../src/dtos/AuthDTO';
import { validateCreateServerDTO, validateUpdateServerDTO } from '../src/dtos/ServerDTO';

const mockAuth = authService as jest.Mocked<typeof authService>;
const mockServer = serverService as jest.Mocked<typeof serverService>;
const mockMonitoring = monitoringService as jest.Mocked<typeof monitoringService>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMocks(reqOverrides: any = {}) {
  const res: any = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    sendFile: jest.fn(),
  };
  const req: any = {
    body: {},
    params: {},
    query: {},
    ip: '127.0.0.1',
    user: { userId: 'user-1', username: 'admin', roles: ['ADMIN'] },
    ...reqOverrides,
  };
  const next = jest.fn();
  return { req, res, next };
}

// ─── AuthController ───────────────────────────────────────────────────────────

describe('AuthController (unit)', () => {
  let ctrl: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new AuthController();
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token and user on valid credentials', async () => {
      const { req, res, next } = makeMocks({ body: { username: 'admin', password: 'pass' } });
      mockAuth.login.mockResolvedValue({ token: 'tok', user: { id: 'u1' }, expiresIn: '1h' } as any);

      await ctrl.login(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ token: 'tok' }) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks({ body: { username: 'x', password: 'y' } });
      const err = new Error('Invalid credentials');
      mockAuth.login.mockRejectedValue(err);

      await ctrl.login(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });

    it('calls next when DTO validation throws', async () => {
      const { req, res, next } = makeMocks({ body: {} });
      const err = new Error('Validation failed');
      (validateLoginDTO as jest.Mock).mockImplementationOnce(() => { throw err; });

      await ctrl.login(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    it('returns 201 with user on success', async () => {
      const { req, res, next } = makeMocks({ body: { username: 'new', password: 'pass' } });
      mockAuth.register.mockResolvedValue({ id: 'u2', username: 'new' } as any);

      await ctrl.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks({ body: { username: 'dup', password: 'pass' } });
      mockAuth.register.mockRejectedValue(new Error('Username taken'));

      await ctrl.register(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when DTO validation throws', async () => {
      const { req, res, next } = makeMocks({ body: {} });
      (validateRegisterDTO as jest.Mock).mockImplementationOnce(() => { throw new Error('bad body'); });

      await ctrl.register(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── verifyToken ──────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('returns valid:true with current user', async () => {
      const { req, res, next } = makeMocks();

      await ctrl.verifyToken(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { valid: true, user: req.user } })
      );
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls authService.logout and responds successfully', async () => {
      const { req, res, next } = makeMocks();

      await ctrl.logout(req, res, next);

      expect(mockAuth.logout).toHaveBeenCalledWith('user-1', '127.0.0.1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('skips logout when no user session', async () => {
      const { req, res, next } = makeMocks({ user: undefined });

      await ctrl.logout(req, res, next);

      expect(mockAuth.logout).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks();
      mockAuth.logout.mockImplementationOnce(() => { throw new Error('fail'); });

      await ctrl.logout(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('responds successfully when password changed', async () => {
      const { req, res, next } = makeMocks({ body: { currentPassword: 'old', newPassword: 'new' } });
      mockAuth.changePassword.mockResolvedValue(undefined);

      await ctrl.changePassword(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when DTO validation throws', async () => {
      const { req, res, next } = makeMocks({ body: {} });
      (validateChangePasswordDTO as jest.Mock).mockImplementationOnce(() => { throw new Error('bad'); });

      await ctrl.changePassword(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks({ body: { currentPassword: 'x', newPassword: 'y' } });
      mockAuth.changePassword.mockRejectedValue(new Error('wrong password'));

      await ctrl.changePassword(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getCurrentUser ───────────────────────────────────────────────────────

  describe('getCurrentUser', () => {
    it('returns user profile', async () => {
      const { req, res, next } = makeMocks();
      mockAuth.getProfile.mockReturnValue({ id: 'user-1', username: 'admin' } as any);

      await ctrl.getCurrentUser(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { user: expect.objectContaining({ id: 'user-1' }) } })
      );
    });

    it('calls next when service throws', async () => {
      const { req, res, next } = makeMocks();
      mockAuth.getProfile.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.getCurrentUser(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('updateCurrentUser', () => {
    it('returns updated user profile', async () => {
      const { req, res, next } = makeMocks({ body: { username: 'updated', email: 'updated@test.com' } });
      mockAuth.updateProfile.mockReturnValue({ id: 'user-1', username: 'updated' } as any);

      await ctrl.updateCurrentUser(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { user: expect.objectContaining({ username: 'updated' }) } })
      );
    });

    it('calls next when profile validation throws', async () => {
      const { req, res, next } = makeMocks({ body: {} });
      (validateUpdateProfileDTO as jest.Mock).mockImplementationOnce(() => { throw new Error('bad'); });

      await ctrl.updateCurrentUser(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

// ─── ServerController ─────────────────────────────────────────────────────────

describe('ServerController (unit)', () => {
  let ctrl: ServerController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new ServerController();
  });

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns servers list', async () => {
      const { req, res, next } = makeMocks();
      mockServer.getAll.mockReturnValue({ servers: [{ id: 's1' }], total: 1 } as any);

      await ctrl.getAll(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ total: 1 }) })
      );
    });

    it('passes query params to service', async () => {
      const { req, res, next } = makeMocks({
        query: { status: 'online', limit: '5', offset: '10' },
      });
      mockServer.getAll.mockReturnValue({ servers: [], total: 0 } as any);

      await ctrl.getAll(req, res, next);

      expect(mockServer.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'online', limit: 5, offset: 10 })
      );
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks();
      mockServer.getAll.mockImplementationOnce(() => { throw new Error('db error'); });

      await ctrl.getAll(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns server by id', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'srv-1' } });
      mockServer.getById.mockReturnValue({ id: 'srv-1', name: 'Web' } as any);

      await ctrl.getById(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { server: expect.objectContaining({ id: 'srv-1' }) } })
      );
    });

    it('calls next when server not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' } });
      mockServer.getById.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.getById(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns 201 with created server', async () => {
      const { req, res, next } = makeMocks({ body: { name: 'new-srv', type: 'application' } });
      mockServer.create.mockReturnValue({ id: 'new-1', name: 'new-srv' } as any);

      await ctrl.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when DTO validation throws', async () => {
      const { req, res, next } = makeMocks({ body: {} });
      (validateCreateServerDTO as jest.Mock).mockImplementationOnce(() => { throw new Error('bad'); });

      await ctrl.create(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when service throws', async () => {
      const { req, res, next } = makeMocks({ body: { name: 'dup' } });
      mockServer.create.mockImplementationOnce(() => { throw new Error('duplicate'); });

      await ctrl.create(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns updated server', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'srv-1' }, body: { status: 'online' } });
      mockServer.update.mockReturnValue({ id: 'srv-1', status: 'online' } as any);

      await ctrl.update(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when DTO validation throws', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'srv-1' }, body: {} });
      (validateUpdateServerDTO as jest.Mock).mockImplementationOnce(() => { throw new Error('bad'); });

      await ctrl.update(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when server not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' }, body: { status: 'online' } });
      mockServer.update.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.update(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('returns success message', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'srv-1' } });

      await ctrl.delete(req, res, next);

      expect(mockServer.delete).toHaveBeenCalledWith('srv-1', 'user-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when server not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' } });
      mockServer.delete.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.delete(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getStatus ────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns server status', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'srv-1' } });
      mockServer.getById.mockReturnValue({ id: 'srv-1', status: 'online' } as any);

      await ctrl.getStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ status: 'online' }),
        })
      );
    });

    it('calls next when server not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' } });
      mockServer.getById.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.getStatus(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getStatistics ────────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns server statistics', async () => {
      const { req, res, next } = makeMocks();
      mockServer.getStatistics.mockReturnValue({ total: 5, online: 4, offline: 1 } as any);

      await ctrl.getStatistics(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ total: 5 }) })
      );
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks();
      mockServer.getStatistics.mockImplementationOnce(() => { throw new Error('fail'); });

      await ctrl.getStatistics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getMetrics ───────────────────────────────────────────────────────────

  describe('getMetrics', () => {
    it('returns server metrics', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'srv-1' } });
      mockServer.getById.mockReturnValue({ id: 'srv-1', name: 'Web' } as any);
      mockMonitoring.getServerMetrics.mockResolvedValue({ cpu: 45 } as any);

      await ctrl.getMetrics(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when monitoring service throws', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'srv-1' } });
      mockServer.getById.mockReturnValue({ id: 'srv-1', name: 'Web' } as any);
      mockMonitoring.getServerMetrics.mockRejectedValue(new Error('prometheus down'));

      await ctrl.getMetrics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
