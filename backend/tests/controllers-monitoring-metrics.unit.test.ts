/**
 * Unit Tests - MonitoringController & MetricsController
 * All service dependencies mocked.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/services/MonitoringService', () => ({
  monitoringService: {
    getCurrentMetrics: jest.fn(),
    getMetricsHistory: jest.fn(),
    getServerMetrics: jest.fn(),
  },
  __esModule: true,
  default: {
    getCurrentMetrics: jest.fn(),
    getMetricsHistory: jest.fn(),
    getServerMetrics: jest.fn(),
  },
}));

jest.mock('../src/services/PrometheusService', () => ({
  __esModule: true,
  default: {
    getCurrentMetrics: jest.fn(),
    getServerMetricsHistory: jest.fn(),
    getSPIMetrics: jest.fn(),
    getATCMetrics: jest.fn(),
    query: jest.fn(),
    queryRange: jest.fn(),
    healthCheck: jest.fn(),
  },
}));

jest.mock('../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  auditLog: jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { MonitoringController } from '../src/controllers/MonitoringController';
import { MetricsController } from '../src/controllers/MetricsController';
import { monitoringService } from '../src/services/MonitoringService';
import prometheusService from '../src/services/PrometheusService';

const mockMonitoring = monitoringService as jest.Mocked<typeof monitoringService>;
const mockPrometheus = prometheusService as jest.Mocked<typeof prometheusService>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMocks(reqOverrides: any = {}) {
  const res: any = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
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

function makeMetricsSnapshot() {
  return {
    servers: [
      {
        server_id: 'srv-1',
        server_name: 'Web Server',
        metrics: { cpu: 45, memory: 60, disk: 40 },
        status: 'online',
        last_update: new Date().toISOString(),
      },
    ],
    summary: { total: 1, online: 1, offline: 0, warning: 0 },
  };
}

// ─── MonitoringController ─────────────────────────────────────────────────────

describe('MonitoringController (unit)', () => {
  let ctrl: MonitoringController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new MonitoringController();
  });

  // ─── getCurrentMetrics ────────────────────────────────────────────────────

  describe('getCurrentMetrics', () => {
    it('returns current metrics snapshot', async () => {
      const { req, res, next } = makeMocks();
      mockMonitoring.getCurrentMetrics.mockResolvedValue(makeMetricsSnapshot() as any);

      await ctrl.getCurrentMetrics(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ servers: expect.any(Array) }) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks();
      mockMonitoring.getCurrentMetrics.mockRejectedValue(new Error('prometheus unreachable'));

      await ctrl.getCurrentMetrics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getSummary ───────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns only summary portion of metrics', async () => {
      const { req, res, next } = makeMocks();
      mockMonitoring.getCurrentMetrics.mockResolvedValue(makeMetricsSnapshot() as any);

      await ctrl.getSummary(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ total: 1 }),
        })
      );
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks();
      mockMonitoring.getCurrentMetrics.mockRejectedValue(new Error('fail'));

      await ctrl.getSummary(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getHistory ───────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('returns metrics history for valid date range', async () => {
      const { req, res, next } = makeMocks({
        query: { from: '2026-01-01', to: '2026-01-31' },
      });
      mockMonitoring.getMetricsHistory.mockResolvedValue([{ timestamp: '2026-01-01' }] as any);

      await ctrl.getHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { history: expect.any(Array) } })
      );
    });

    it('calls next when from date is missing', async () => {
      const { req, res, next } = makeMocks({ query: { to: '2026-01-31' } });

      await ctrl.getHistory(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when to date is missing', async () => {
      const { req, res, next } = makeMocks({ query: { from: '2026-01-01' } });

      await ctrl.getHistory(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('passes all query filters to service', async () => {
      const { req, res, next } = makeMocks({
        query: { from: '2026-01-01', to: '2026-01-31', server_id: 'srv-1', metric_type: 'cpu', interval: '1h' },
      });
      mockMonitoring.getMetricsHistory.mockResolvedValue([] as any);

      await ctrl.getHistory(req, res, next);

      expect(mockMonitoring.getMetricsHistory).toHaveBeenCalledWith(
        expect.objectContaining({ server_id: 'srv-1', metric_type: 'cpu', interval: '1h' })
      );
    });
  });

  // ─── getServerHistory ─────────────────────────────────────────────────────

  describe('getServerHistory', () => {
    it('returns history for a specific server', async () => {
      const { req, res, next } = makeMocks({
        params: { serverId: 'srv-1' },
        query: { from: '2026-01-01', to: '2026-01-31' },
      });
      mockMonitoring.getMetricsHistory.mockResolvedValue([] as any);

      await ctrl.getServerHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ serverId: 'srv-1' }) })
      );
    });

    it('calls next when date range is missing', async () => {
      const { req, res, next } = makeMocks({ params: { serverId: 'srv-1' }, query: {} });

      await ctrl.getServerHistory(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getServerMetrics ─────────────────────────────────────────────────────

  describe('getServerMetrics', () => {
    it('returns metrics for specific server', async () => {
      const { req, res, next } = makeMocks({ params: { serverId: 'srv-1' } });
      mockMonitoring.getServerMetrics.mockResolvedValue({ cpu: 45, memory: 60 } as any);

      await ctrl.getServerMetrics(req, res, next);

      expect(mockMonitoring.getServerMetrics).toHaveBeenCalledWith('srv-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when server not found', async () => {
      const { req, res, next } = makeMocks({ params: { serverId: 'gone' } });
      mockMonitoring.getServerMetrics.mockRejectedValue(new Error('not found'));

      await ctrl.getServerMetrics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getPrometheusMetrics ─────────────────────────────────────────────────

  describe('getPrometheusMetrics', () => {
    it('returns raw prometheus metrics', async () => {
      const { req, res, next } = makeMocks();
      mockMonitoring.getCurrentMetrics.mockResolvedValue(makeMetricsSnapshot() as any);

      await ctrl.getPrometheusMetrics(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ servers: expect.any(Array), raw_metrics: expect.any(Array) }),
        })
      );
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks();
      mockMonitoring.getCurrentMetrics.mockRejectedValue(new Error('fail'));

      await ctrl.getPrometheusMetrics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

// ─── MetricsController ────────────────────────────────────────────────────────

describe('MetricsController (unit)', () => {
  let ctrl: MetricsController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new MetricsController();
  });

  // ─── getCurrentMetrics ────────────────────────────────────────────────────

  describe('getCurrentMetrics', () => {
    it('returns metrics from prometheus service', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.getCurrentMetrics.mockResolvedValue([{ server: 'srv-1', cpu: 45 }] as any);

      await ctrl.getCurrentMetrics(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) })
      );
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.getCurrentMetrics.mockRejectedValue(new Error('prometheus down'));

      await ctrl.getCurrentMetrics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getServerHistory ─────────────────────────────────────────────────────

  describe('getServerHistory', () => {
    it('returns server history for valid params', async () => {
      const { req, res, next } = makeMocks({
        params: { serverId: 'srv-1' },
        query: { start: '1700000000', end: '1700003600', step: '1m' },
      });
      mockPrometheus.getServerMetricsHistory.mockResolvedValue({ cpu: [], memory: [] } as any);

      await ctrl.getServerHistory(req, res, next);

      expect(mockPrometheus.getServerMetricsHistory).toHaveBeenCalledWith('srv-1', 1700000000, 1700003600, '1m');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 400 when start or end are missing', async () => {
      const { req, res, next } = makeMocks({ params: { serverId: 'srv-1' }, query: {} });

      await ctrl.getServerHistory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'MISSING_PARAMETERS' }) })
      );
    });
  });

  // ─── getSPIMetrics ────────────────────────────────────────────────────────

  describe('getSPIMetrics', () => {
    it('returns SPI metrics', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.getSPIMetrics.mockResolvedValue({ status: 'up', transactions: 100 } as any);

      await ctrl.getSPIMetrics(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, meta: expect.objectContaining({ system: 'SPI' }) })
      );
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.getSPIMetrics.mockRejectedValue(new Error('fail'));

      await ctrl.getSPIMetrics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getATCMetrics ────────────────────────────────────────────────────────

  describe('getATCMetrics', () => {
    it('returns ATC metrics', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.getATCMetrics.mockResolvedValue({ status: 'up' } as any);

      await ctrl.getATCMetrics(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, meta: expect.objectContaining({ system: 'ATC' }) })
      );
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.getATCMetrics.mockRejectedValue(new Error('fail'));

      await ctrl.getATCMetrics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── executeQuery ─────────────────────────────────────────────────────────

  describe('executeQuery', () => {
    it('executes custom prometheus query', async () => {
      const { req, res, next } = makeMocks({ body: { query: 'cpu_usage_percent', time: 1700000000 } });
      mockPrometheus.query.mockResolvedValue({ data: { result: [] } } as any);

      await ctrl.executeQuery(req, res, next);

      expect(mockPrometheus.query).toHaveBeenCalledWith('cpu_usage_percent', 1700000000);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 400 when query param is missing', async () => {
      const { req, res, next } = makeMocks({ body: {} });

      await ctrl.executeQuery(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'MISSING_QUERY' }) })
      );
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks({ body: { query: 'bad{query}' } });
      mockPrometheus.query.mockRejectedValue(new Error('parse error'));

      await ctrl.executeQuery(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── executeRangeQuery ────────────────────────────────────────────────────

  describe('executeRangeQuery', () => {
    it('executes range query with all params', async () => {
      const { req, res, next } = makeMocks({
        body: { query: 'cpu_usage_percent', start: 1700000000, end: 1700003600, step: '15s' },
      });
      mockPrometheus.queryRange.mockResolvedValue({ data: { result: [] } } as any);

      await ctrl.executeRangeQuery(req, res, next);

      expect(mockPrometheus.queryRange).toHaveBeenCalledWith(
        'cpu_usage_percent', 1700000000, 1700003600, '15s'
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 400 when required params are missing', async () => {
      const { req, res, next } = makeMocks({ body: { query: 'cpu_usage_percent' } });

      await ctrl.executeRangeQuery(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'MISSING_PARAMETERS' }) })
      );
    });

    it('uses default step when not provided', async () => {
      const { req, res, next } = makeMocks({
        body: { query: 'cpu', start: 1700000000, end: 1700003600 },
      });
      mockPrometheus.queryRange.mockResolvedValue({ data: { result: [] } } as any);

      await ctrl.executeRangeQuery(req, res, next);

      expect(mockPrometheus.queryRange).toHaveBeenCalledWith(
        'cpu', 1700000000, 1700003600, '15s'
      );
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks({
        body: { query: 'bad', start: 1, end: 2, step: '15s' },
      });
      mockPrometheus.queryRange.mockRejectedValue(new Error('fail'));

      await ctrl.executeRangeQuery(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── healthCheck ──────────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('returns connected status when prometheus is healthy', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.healthCheck.mockResolvedValue(true);

      await ctrl.healthCheck(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ prometheus: 'connected', status: 'healthy' }),
        })
      );
    });

    it('returns disconnected status when prometheus is unhealthy', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.healthCheck.mockResolvedValue(false);

      await ctrl.healthCheck(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ prometheus: 'disconnected', status: 'unhealthy' }),
        })
      );
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks();
      mockPrometheus.healthCheck.mockRejectedValue(new Error('fail'));

      await ctrl.healthCheck(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
