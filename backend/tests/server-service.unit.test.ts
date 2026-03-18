/**
 * Unit Tests - ServerService
 * Repositorios y audit log mockeados — sin base de datos real.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/repositories/ServerRepository', () => ({
  serverRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findByStatus: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    getStatistics: jest.fn(),
  },
}));

jest.mock('../src/repositories/AlertRepository', () => ({
  alertRepository: {
    deleteByServer: jest.fn(),
  },
}));

jest.mock('../src/repositories/AuditLogRepository', () => ({
  auditLogRepository: { create: jest.fn() },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { ServerService } from '../src/services/ServerService';
import { serverRepository } from '../src/repositories/ServerRepository';
import { alertRepository } from '../src/repositories/AlertRepository';

const mockRepo = serverRepository as jest.Mocked<typeof serverRepository>;
const mockAlertRepo = alertRepository as jest.Mocked<typeof alertRepository>;

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeServer(overrides: any = {}) {
  return {
    id: 'srv-1',
    name: 'Web Server',
    ip_address: '192.168.1.1',
    type: 'application',
    environment: 'production',
    status: 'online',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ServerService (unit)', () => {
  let service: ServerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServerService();
  });

  // ─── getAll ──────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns servers and total', () => {
      mockRepo.findAll.mockReturnValue([makeServer()] as any);
      mockRepo.count.mockReturnValue(1);

      const result = service.getAll();

      expect(result.total).toBe(1);
      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].name).toBe('Web Server');
    });

    it('returns empty list when no servers', () => {
      mockRepo.findAll.mockReturnValue([]);
      mockRepo.count.mockReturnValue(0);

      const result = service.getAll();

      expect(result.total).toBe(0);
      expect(result.servers).toHaveLength(0);
    });

    it('passes filters to repository', () => {
      mockRepo.findAll.mockReturnValue([]);
      mockRepo.count.mockReturnValue(0);

      service.getAll({ status: 'online', type: 'database', environment: 'production', limit: 10, offset: 5 });

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'online', type: 'database', environment: 'production', limit: 10, offset: 5 })
      );
    });
  });

  // ─── getById ─────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns server when it exists', () => {
      mockRepo.findById.mockReturnValue(makeServer() as any);

      const result = service.getById('srv-1');

      expect(result.id).toBe('srv-1');
    });

    it('throws NotFoundError when server does not exist', () => {
      mockRepo.findById.mockReturnValue(null as any);

      expect(() => service.getById('missing')).toThrow('not found');
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a server when name is unique', () => {
      mockRepo.findByName.mockReturnValue(null as any);
      mockRepo.create.mockReturnValue(makeServer() as any);

      const result = service.create({ name: 'Web Server', type: 'application', environment: 'production' });

      expect(result.name).toBe('Web Server');
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictError when name already exists', () => {
      mockRepo.findByName.mockReturnValue(makeServer() as any);

      expect(() => service.create({ name: 'Web Server', type: 'application', environment: 'production' }))
        .toThrow('already exists');
    });

    it('logs creation to audit log', () => {
      const { auditLogRepository } = require('../src/repositories/AuditLogRepository');
      mockRepo.findByName.mockReturnValue(null as any);
      mockRepo.create.mockReturnValue(makeServer() as any);

      service.create({ name: 'Web Server', type: 'application', environment: 'production' }, 'user-1');

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SERVER_CREATED', user_id: 'user-1' })
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates server when it exists', () => {
      mockRepo.findById.mockReturnValue(makeServer() as any);
      mockRepo.findByName.mockReturnValue(null as any);
      mockRepo.update.mockReturnValue(makeServer({ name: 'Updated' }) as any);

      const result = service.update('srv-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundError when server does not exist', () => {
      mockRepo.findById.mockReturnValue(null as any);

      expect(() => service.update('ghost', { name: 'X' })).toThrow('not found');
    });

    it('throws ConflictError when new name already taken by another server', () => {
      mockRepo.findById.mockReturnValue(makeServer({ id: 'srv-1', name: 'Old' }) as any);
      mockRepo.findByName.mockReturnValue(makeServer({ id: 'srv-2', name: 'Taken' }) as any);

      expect(() => service.update('srv-1', { name: 'Taken' })).toThrow('already exists');
    });

    it('allows updating to the same name (no conflict with itself)', () => {
      const existing = makeServer({ id: 'srv-1', name: 'Same' });
      mockRepo.findById.mockReturnValue(existing as any);
      mockRepo.update.mockReturnValue(existing as any);

      const result = service.update('srv-1', { name: 'Same' });

      expect(result.name).toBe('Same');
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes server when it exists', () => {
      mockRepo.findById.mockReturnValue(makeServer() as any);
      mockRepo.delete.mockReturnValue(true as any);

      expect(() => service.delete('srv-1')).not.toThrow();
      expect(mockAlertRepo.deleteByServer).toHaveBeenCalledWith('srv-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('srv-1');
    });

    it('throws NotFoundError when server does not exist', () => {
      mockRepo.findById.mockReturnValue(null as any);

      expect(() => service.delete('ghost')).toThrow('not found');
    });

    it('logs deletion to audit log', () => {
      const { auditLogRepository } = require('../src/repositories/AuditLogRepository');
      mockRepo.findById.mockReturnValue(makeServer() as any);
      mockRepo.delete.mockReturnValue(true as any);

      service.delete('srv-1', 'user-2');

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SERVER_DELETED', user_id: 'user-2' })
      );
    });

    it('throws when repository deletion does not remove the server', () => {
      mockRepo.findById.mockReturnValue(makeServer() as any);
      mockRepo.delete.mockReturnValue(false as any);

      expect(() => service.delete('srv-1')).toThrow('could not be deleted');
    });
  });

  // ─── updateStatus ────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('updates status when server exists', () => {
      mockRepo.findById.mockReturnValue(makeServer() as any);

      expect(() => service.updateStatus('srv-1', 'offline')).not.toThrow();
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('srv-1', 'offline');
    });

    it('throws NotFoundError when server does not exist', () => {
      mockRepo.findById.mockReturnValue(null as any);

      expect(() => service.updateStatus('ghost', 'offline')).toThrow('not found');
    });
  });

  // ─── getStatistics ──────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns statistics from repository', () => {
      const stats = { total: 5, online: 3, offline: 1, degraded: 1, unknown: 0 };
      mockRepo.getStatistics.mockReturnValue(stats);

      const result = service.getStatistics();

      expect(result).toEqual(stats);
    });
  });

  // ─── getByStatus ─────────────────────────────────────────────────────────

  describe('getByStatus', () => {
    it('returns list of servers with given status', () => {
      mockRepo.findByStatus.mockReturnValue([makeServer({ status: 'offline' })] as any);

      const result = service.getByStatus('offline');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('offline');
    });

    it('returns empty array when no servers with that status', () => {
      mockRepo.findByStatus.mockReturnValue([]);

      const result = service.getByStatus('degraded');

      expect(result).toHaveLength(0);
    });
  });
});
