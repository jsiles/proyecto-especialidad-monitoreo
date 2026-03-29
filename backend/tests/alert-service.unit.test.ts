/**
 * Unit Tests - AlertService
 * Repositorios, NotificationService y AuditLog mockeados.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/repositories/AlertRepository', () => ({
  alertRepository: {
    findAll: jest.fn(),
    findActive: jest.fn(),
    findById: jest.fn(),
    findByIdWithDetails: jest.fn(),
    create: jest.fn(),
    acknowledge: jest.fn(),
    resolve: jest.fn(),
    getStatistics: jest.fn(),
    countAll: jest.fn(),
  },
}));

jest.mock('../src/repositories/ThresholdRepository', () => ({
  thresholdRepository: {
    findAll: jest.fn(),
    findByServer: jest.fn(),
    findById: jest.fn(),
    findByIdWithServer: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getDefaultThresholds: jest.fn(),
  },
}));

jest.mock('../src/repositories/ServerRepository', () => ({
  serverRepository: {
    findById: jest.fn(),
  },
}));

jest.mock('../src/repositories/AuditLogRepository', () => ({
  auditLogRepository: { create: jest.fn() },
}));

jest.mock('../src/services/NotificationService', () => ({
  __esModule: true,
  default: {
    emitAlertCreated: jest.fn(),
    emitAlertAcknowledged: jest.fn(),
    emitAlertResolved: jest.fn(),
  },
  notificationService: {
    emitAlertCreated: jest.fn(),
    emitAlertAcknowledged: jest.fn(),
    emitAlertResolved: jest.fn(),
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { AlertService } from '../src/services/AlertService';
import { alertRepository } from '../src/repositories/AlertRepository';
import { thresholdRepository } from '../src/repositories/ThresholdRepository';
import { serverRepository } from '../src/repositories/ServerRepository';
import notificationService from '../src/services/NotificationService';

const mockAlertRepo = alertRepository as jest.Mocked<typeof alertRepository>;
const mockThresholdRepo = thresholdRepository as jest.Mocked<typeof thresholdRepository>;
const mockServerRepo = serverRepository as jest.Mocked<typeof serverRepository>;
const mockNotification = notificationService as jest.Mocked<typeof notificationService>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAlertWithDetails(overrides: any = {}) {
  return {
    id: 'alert-1',
    server_id: 'srv-1',
    server_name: 'Web Server',
    threshold_id: null,
    message: 'CPU usage high',
    severity: 'warning',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved: false,
    resolved_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeThresholdWithServer(overrides: any = {}) {
  return {
    id: 'thresh-1',
    server_id: 'srv-1',
    server_name: 'Web Server',
    metric_type: 'cpu',
    threshold_value: 80,
    severity: 'warning',
    enabled: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AlertService (unit)', () => {
  let service: AlertService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertService();
    // Setup default return values
    mockAlertRepo.countAll.mockReturnValue(0);
  });

  // ─── getAlerts ───────────────────────────────────────────────────────────

  describe('getAlerts', () => {
    it('returns alerts and total', () => {
      mockAlertRepo.findAll.mockReturnValue([makeAlertWithDetails()] as any);
      mockAlertRepo.countAll.mockReturnValue(1);

      const result = service.getAlerts();

      expect(result.total).toBe(1);
      expect(result.alerts).toHaveLength(1);
    });

    it('returns empty when no alerts', () => {
      mockAlertRepo.findAll.mockReturnValue([]);
      mockAlertRepo.countAll.mockReturnValue(0);

      const result = service.getAlerts();

      expect(result.total).toBe(0);
    });

    it('passes query filters to repository', () => {
      mockAlertRepo.findAll.mockReturnValue([]);
      mockAlertRepo.countAll.mockReturnValue(0);

      service.getAlerts({ severity: 'critical', resolved: false, limit: 10, offset: 5 } as any);

      expect(mockAlertRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical', resolved: false, limit: 10, offset: 5 })
      );
    });
  });

  // ─── getActiveAlerts ─────────────────────────────────────────────────────

  describe('getActiveAlerts', () => {
    it('returns active alerts', () => {
      mockAlertRepo.findActive.mockReturnValue([makeAlertWithDetails()] as any);

      const result = service.getActiveAlerts();

      expect(result).toHaveLength(1);
    });

    it('deduplicates alerts with same server/severity/message', () => {
      const dup = makeAlertWithDetails({ message: 'CPU usage high', severity: 'warning' });
      mockAlertRepo.findActive.mockReturnValue([dup, { ...dup, id: 'alert-2' }] as any);

      const result = service.getActiveAlerts();

      expect(result).toHaveLength(1);
    });

    it('keeps alerts with different messages', () => {
      mockAlertRepo.findActive.mockReturnValue([
        makeAlertWithDetails({ id: 'a1', message: 'CPU high' }),
        makeAlertWithDetails({ id: 'a2', message: 'Memory high' }),
      ] as any);

      const result = service.getActiveAlerts();

      expect(result).toHaveLength(2);
    });

    it('filters by severity when provided', () => {
      mockAlertRepo.findActive.mockReturnValue([]);

      service.getActiveAlerts('critical');

      expect(mockAlertRepo.findActive).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical' })
      );
    });
  });

  // ─── getAlertById ────────────────────────────────────────────────────────

  describe('getAlertById', () => {
    it('returns alert when it exists', () => {
      mockAlertRepo.findByIdWithDetails.mockReturnValue(makeAlertWithDetails() as any);

      const result = service.getAlertById('alert-1');

      expect(result.id).toBe('alert-1');
    });

    it('throws NotFoundError when alert does not exist', () => {
      mockAlertRepo.findByIdWithDetails.mockReturnValue(null as any);

      expect(() => service.getAlertById('missing')).toThrow('not found');
    });
  });

  // ─── createAlert ─────────────────────────────────────────────────────────

  describe('createAlert', () => {
    it('creates alert and emits notification', () => {
      mockServerRepo.findById.mockReturnValue({ id: 'srv-1' } as any);
      mockAlertRepo.create.mockReturnValue({ id: 'alert-new' } as any);
      mockAlertRepo.findByIdWithDetails.mockReturnValue(makeAlertWithDetails({ id: 'alert-new' }) as any);

      const result = service.createAlert({ server_id: 'srv-1', message: 'CPU high', severity: 'warning' });

      expect(result.id).toBe('alert-new');
      expect(mockNotification.emitAlertCreated).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestError when server does not exist', () => {
      mockServerRepo.findById.mockReturnValue(null as any);

      expect(() => service.createAlert({ server_id: 'gone', message: 'test', severity: 'warning' }))
        .toThrow('not found');
    });
  });

  // ─── acknowledgeAlert ────────────────────────────────────────────────────

  describe('acknowledgeAlert', () => {
    it('acknowledges alert and emits notification', () => {
      const alert = makeAlertWithDetails({ acknowledged: false });
      mockAlertRepo.findById.mockReturnValue(alert as any);
      mockAlertRepo.acknowledge.mockReturnValue({ ...alert, acknowledged: true, id: 'alert-1' } as any);
      mockAlertRepo.findByIdWithDetails.mockReturnValue({ ...alert, acknowledged: true } as any);

      const result = service.acknowledgeAlert('alert-1', 'user-1', 'admin');

      expect(result.acknowledged).toBe(true);
      expect(mockNotification.emitAlertAcknowledged).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundError when alert does not exist', () => {
      mockAlertRepo.findById.mockReturnValue(null as any);

      expect(() => service.acknowledgeAlert('gone', 'u', 'u')).toThrow('not found');
    });

    it('throws BadRequestError when alert already acknowledged', () => {
      mockAlertRepo.findById.mockReturnValue(makeAlertWithDetails({ acknowledged: true }) as any);

      expect(() => service.acknowledgeAlert('alert-1', 'u', 'u')).toThrow('already acknowledged');
    });
  });

  // ─── resolveAlert ────────────────────────────────────────────────────────

  describe('resolveAlert', () => {
    it('resolves alert and emits notification', () => {
      const alert = makeAlertWithDetails({ resolved: false });
      mockAlertRepo.findById.mockReturnValue(alert as any);
      mockAlertRepo.findAll.mockReturnValue([alert] as any);
      mockAlertRepo.resolve.mockReturnValue({ ...alert, resolved: true } as any);
      mockAlertRepo.findByIdWithDetails.mockReturnValue({ ...alert, resolved: true } as any);

      const result = service.resolveAlert('alert-1');

      expect(result.resolved).toBe(true);
      expect(mockNotification.emitAlertResolved).toHaveBeenCalledTimes(1);
    });

    it('resolves related active alerts with the same threshold', () => {
      const alert = makeAlertWithDetails({ id: 'alert-1', threshold_id: 'threshold-1', resolved: false });
      const duplicate = makeAlertWithDetails({
        id: 'alert-2',
        threshold_id: 'threshold-1',
        message: 'CPU usage high again',
        resolved: false,
      });

      mockAlertRepo.findById.mockReturnValue(alert as any);
      mockAlertRepo.findAll.mockReturnValue([alert, duplicate] as any);
      mockAlertRepo.resolve.mockReturnValue({ ...alert, resolved: true } as any);
      mockAlertRepo.findByIdWithDetails.mockImplementation((id: string) => ({
        ...(id === 'alert-2' ? duplicate : alert),
        resolved: true,
      }) as any);

      service.resolveAlert('alert-1');

      expect(mockAlertRepo.resolve).toHaveBeenCalledWith('alert-1');
      expect(mockAlertRepo.resolve).toHaveBeenCalledWith('alert-2');
      expect(mockNotification.emitAlertResolved).toHaveBeenCalledTimes(2);
    });

    it('throws NotFoundError when alert does not exist', () => {
      mockAlertRepo.findById.mockReturnValue(null as any);

      expect(() => service.resolveAlert('gone')).toThrow('not found');
    });

    it('throws BadRequestError when alert already resolved', () => {
      mockAlertRepo.findById.mockReturnValue(makeAlertWithDetails({ resolved: true }) as any);

      expect(() => service.resolveAlert('alert-1')).toThrow('already resolved');
    });
  });

  // ─── getAlertStatistics ──────────────────────────────────────────────────

  describe('getAlertStatistics', () => {
    it('returns statistics from repository', () => {
      const stats = { total: 10, critical: 3, warning: 7, resolved: 5 };
      mockAlertRepo.getStatistics.mockReturnValue(stats as any);

      const result = service.getAlertStatistics('2026-01-01', '2026-01-31');

      expect(result).toEqual(stats);
      expect(mockAlertRepo.getStatistics).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    });

    it('calls getStatistics without dates when not provided', () => {
      mockAlertRepo.getStatistics.mockReturnValue({} as any);

      service.getAlertStatistics();

      expect(mockAlertRepo.getStatistics).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  // ─── getThresholds ──────────────────────────────────────────────────────

  describe('getThresholds', () => {
    it('returns all thresholds when no serverId', () => {
      mockThresholdRepo.findAll.mockReturnValue([makeThresholdWithServer()] as any);

      const result = service.getThresholds();

      expect(result).toHaveLength(1);
      expect(mockThresholdRepo.findAll).toHaveBeenCalledWith({ enabled: true });
    });

    it('returns thresholds filtered by serverId', () => {
      mockThresholdRepo.findByServer.mockReturnValue([makeThresholdWithServer()] as any);

      const result = service.getThresholds('srv-1');

      expect(result).toHaveLength(1);
      expect(mockThresholdRepo.findByServer).toHaveBeenCalledWith('srv-1');
    });
  });

  // ─── getThresholdById ───────────────────────────────────────────────────

  describe('getThresholdById', () => {
    it('returns threshold when it exists', () => {
      mockThresholdRepo.findByIdWithServer.mockReturnValue(makeThresholdWithServer() as any);

      const result = service.getThresholdById('thresh-1');

      expect(result.id).toBe('thresh-1');
    });

    it('throws NotFoundError when threshold does not exist', () => {
      mockThresholdRepo.findByIdWithServer.mockReturnValue(null as any);

      expect(() => service.getThresholdById('gone')).toThrow('not found');
    });
  });

  // ─── createThreshold ────────────────────────────────────────────────────

  describe('createThreshold', () => {
    it('creates threshold when valid and unique', () => {
      mockServerRepo.findById.mockReturnValue({ id: 'srv-1' } as any);
      mockThresholdRepo.exists.mockReturnValue(false);
      mockThresholdRepo.create.mockReturnValue({ id: 'thresh-new' } as any);
      mockThresholdRepo.findByIdWithServer.mockReturnValue(makeThresholdWithServer({ id: 'thresh-new' }) as any);

      const result = service.createThreshold({ server_id: 'srv-1', metric_type: 'cpu', threshold_value: 80 });

      expect(result.id).toBe('thresh-new');
    });

    it('creates a global threshold when server_id is null', () => {
      mockThresholdRepo.exists.mockReturnValue(false);
      mockThresholdRepo.create.mockReturnValue({ id: 'thresh-global' } as any);
      mockThresholdRepo.findByIdWithServer.mockReturnValue(
        makeThresholdWithServer({ id: 'thresh-global', server_id: null, server_name: null }) as any
      );

      const result = service.createThreshold({ server_id: null, metric_type: 'cpu', threshold_value: 80 });

      expect(result.id).toBe('thresh-global');
      expect(mockServerRepo.findById).not.toHaveBeenCalled();
      expect(mockThresholdRepo.exists).toHaveBeenCalledWith(null, 'cpu', 'warning');
    });

    it('throws BadRequestError when server does not exist', () => {
      mockServerRepo.findById.mockReturnValue(null as any);

      expect(() =>
        service.createThreshold({ server_id: 'gone', metric_type: 'cpu', threshold_value: 80 })
      ).toThrow('not found');
    });

    it('throws BadRequestError when threshold already exists for that metric/severity', () => {
      mockServerRepo.findById.mockReturnValue({ id: 'srv-1' } as any);
      mockThresholdRepo.exists.mockReturnValue(true);

      expect(() =>
        service.createThreshold({ server_id: 'srv-1', metric_type: 'cpu', threshold_value: 80 })
      ).toThrow('already exists');
    });
  });

  // ─── updateThreshold ────────────────────────────────────────────────────

  describe('updateThreshold', () => {
    it('updates threshold when it exists', () => {
      mockThresholdRepo.findById.mockReturnValue({ id: 'thresh-1' } as any);
      mockThresholdRepo.update.mockReturnValue({ id: 'thresh-1' } as any);
      mockThresholdRepo.findByIdWithServer.mockReturnValue(makeThresholdWithServer({ threshold_value: 90 }) as any);

      const result = service.updateThreshold('thresh-1', { threshold_value: 90 });

      expect(result.threshold_value).toBe(90);
    });

    it('throws NotFoundError when threshold does not exist', () => {
      mockThresholdRepo.findById.mockReturnValue(null as any);

      expect(() => service.updateThreshold('gone', { threshold_value: 90 })).toThrow('not found');
    });
  });

  // ─── deleteThreshold ────────────────────────────────────────────────────

  describe('deleteThreshold', () => {
    it('disables threshold when it exists', () => {
      mockThresholdRepo.findById.mockReturnValue({ id: 'thresh-1' } as any);

      expect(() => service.deleteThreshold('thresh-1')).not.toThrow();
      expect(mockThresholdRepo.update).toHaveBeenCalledWith('thresh-1', { enabled: false });
    });

    it('throws NotFoundError when threshold does not exist', () => {
      mockThresholdRepo.findById.mockReturnValue(null as any);

      expect(() => service.deleteThreshold('gone')).toThrow('not found');
    });

    it('logs deletion when userId is provided', () => {
      const { auditLogRepository } = require('../src/repositories/AuditLogRepository');
      mockThresholdRepo.findById.mockReturnValue({ id: 'thresh-1' } as any);

      service.deleteThreshold('thresh-1', 'user-99');

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'THRESHOLD_DELETED', user_id: 'user-99' })
      );
    });
  });

  // ─── initializeDefaultThresholds ────────────────────────────────────────

  describe('initializeDefaultThresholds', () => {
    it('creates default thresholds that do not exist yet', () => {
      mockThresholdRepo.getDefaultThresholds.mockReturnValue([
        { metric_type: 'cpu', severity: 'warning', threshold_value: 80 } as any,
        { metric_type: 'memory', severity: 'critical', threshold_value: 95 } as any,
      ]);
      // First exists, second does not
      mockThresholdRepo.exists.mockReturnValueOnce(false).mockReturnValueOnce(false);
      mockThresholdRepo.create.mockReturnValue({ id: 't' } as any);

      service.initializeDefaultThresholds();

      expect(mockThresholdRepo.create).toHaveBeenCalledTimes(2);
    });

    it('skips thresholds that already exist', () => {
      mockThresholdRepo.getDefaultThresholds.mockReturnValue([
        { metric_type: 'cpu', severity: 'warning', threshold_value: 80 } as any,
      ]);
      mockThresholdRepo.exists.mockReturnValue(true);

      service.initializeDefaultThresholds();

      expect(mockThresholdRepo.create).not.toHaveBeenCalled();
    });
  });
});
