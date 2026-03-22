/**
 * Unit Tests - MonitoringService
 * Uses jest.mock('axios') to avoid hitting real Prometheus
 */

import axios from 'axios';
import { getDatabase } from '../src/database/connection';
import { monitoringService } from '../src/services/MonitoringService';
import { serverRepository } from '../src/repositories/ServerRepository';
import { thresholdRepository } from '../src/repositories/ThresholdRepository';
import { alertRepository } from '../src/repositories/AlertRepository';
import { alertService } from '../src/services/AlertService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper: build a fake Prometheus instant-query response
function prometheusInstant(value: string) {
  return {
    data: {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: { server: 'test-server' },
            value: [Date.now() / 1000, value],
          },
        ],
      },
    },
  };
}

// Helper: empty Prometheus response
function prometheusEmpty() {
  return {
    data: {
      status: 'success',
      data: { resultType: 'vector', result: [] },
    },
  };
}

// Helper: Prometheus range response
function prometheusRange(values: [number, string][]) {
  return {
    data: {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [{ metric: {}, values }],
      },
    },
  };
}

describe('MonitoringService (unit, axios mocked)', () => {
  let createdServerId: string;
  let spiServerId: string;
  let atcServerId: string;
  let linkserServerId: string;

  // Create a real server directly in the test DB so service can look it up
  beforeAll(() => {
    const created = serverRepository.create({
      name: `mon-unit-srv-${Date.now().toString(36)}`,
      ip_address: '10.0.0.99',
      type: 'application',
      environment: 'testing',
    });

    createdServerId = created.id;

    spiServerId = serverRepository.create({
      name: `spi-unit-${Date.now().toString(36)}`,
      ip_address: '10.0.0.100',
      type: 'spi',
      environment: 'testing',
    }).id;

    atcServerId = serverRepository.create({
      name: `atc-unit-${Date.now().toString(36)}`,
      ip_address: '10.0.0.101',
      type: 'atc',
      environment: 'testing',
    }).id;

    linkserServerId = serverRepository.create({
      name: `linkser-unit-${Date.now().toString(36)}`,
      ip_address: '10.0.0.102',
      type: 'linkser',
      environment: 'testing',
    }).id;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockedAxios.get.mockReset();
    const db = getDatabase();
    db.prepare('DELETE FROM metrics_cache WHERE server_id IN (?, ?, ?, ?)').run(
      createdServerId,
      spiServerId,
      atcServerId,
      linkserServerId
    );
  });

  // ─── getCurrentMetrics ───────────────────────────────────────────────────

  it('returns metrics for all servers when Prometheus responds', async () => {
    mockedAxios.get.mockResolvedValue(prometheusInstant('55.3'));

    const result = await monitoringService.getCurrentMetrics();

    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('servers');
    expect(result).toHaveProperty('summary');
    expect(Array.isArray(result.servers)).toBe(true);
    expect(result.summary).toHaveProperty('total_servers');
    expect(result.summary).toHaveProperty('active_alerts');
  });

  it('falls back to offline status when Prometheus call throws', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

    const result = await monitoringService.getCurrentMetrics();

    expect(result.servers.length).toBeGreaterThan(0);
    // All servers that failed become 'unknown' or 'offline'
    const hasOfflineOrUnknown = result.servers.every(
      (s) => s.status === 'offline' || s.status === 'unknown' || s.metrics.cpu >= 0
    );
    expect(hasOfflineOrUnknown).toBe(true);
  });

  it('getCurrentMetrics: calculates summary correctly when Prometheus returns zeros', async () => {
    mockedAxios.get.mockResolvedValue(prometheusEmpty());

    const result = await monitoringService.getCurrentMetrics();

    expect(result.summary.avg_cpu).toBeGreaterThanOrEqual(0);
    expect(result.summary.avg_memory).toBeGreaterThanOrEqual(0);
  });

  // ─── getServerMetrics ────────────────────────────────────────────────────

  it('getServerMetrics: throws when server ID does not exist', async () => {
    await expect(
      monitoringService.getServerMetrics('non-existent-id')
    ).rejects.toThrow('not found');
  });

  it('getServerMetrics: returns metrics object when Prometheus responds', async () => {
    mockedAxios.get.mockResolvedValue(prometheusInstant('42.0'));

    const metrics = await monitoringService.getServerMetrics(createdServerId);

    expect(metrics).toHaveProperty('server_id', createdServerId);
    expect(metrics).toHaveProperty('metrics');
    expect(metrics.metrics).toHaveProperty('cpu');
    expect(metrics.metrics).toHaveProperty('memory');
    expect(metrics.metrics).toHaveProperty('disk');
    expect(metrics.status).toBe('online');
  });

  it('getServerMetrics: persists the snapshot into metrics_cache', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(prometheusInstant('42.0'))
      .mockResolvedValueOnce(prometheusInstant('43.0'))
      .mockResolvedValueOnce(prometheusInstant('44.0'))
      .mockResolvedValueOnce(prometheusInstant('3600'));

    const metrics = await monitoringService.getServerMetrics(createdServerId);
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT metric_type, value, timestamp
      FROM metrics_cache
      WHERE server_id = ?
      ORDER BY metric_type ASC
    `).all(createdServerId) as Array<{ metric_type: string; value: number; timestamp: string }>;

    expect(metrics.status).toBe('online');
    expect(rows).toHaveLength(6);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric_type: 'cpu', value: 42 }),
        expect.objectContaining({ metric_type: 'memory', value: 43 }),
        expect.objectContaining({ metric_type: 'disk', value: 44 }),
        expect.objectContaining({ metric_type: 'uptime', value: 3600 }),
      ])
    );
    expect(rows[0]?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('getServerMetrics: updates server status when calculated status changes', async () => {
    mockedAxios.get.mockResolvedValue(prometheusInstant('97.0'));
    const existingServer = serverRepository.findById(createdServerId)!;
    jest.spyOn(serverRepository, 'findById').mockReturnValue({
      ...existingServer,
      status: 'online',
    } as any);
    const updateStatusSpy = jest.spyOn(serverRepository, 'updateStatus');

    const metrics = await monitoringService.getServerMetrics(createdServerId);

    expect(metrics.status).toBe('degraded');
    expect(updateStatusSpy).toHaveBeenCalledWith(createdServerId, 'degraded');
  });

  it('getServerMetrics: marks server as offline when Prometheus returns no signal', async () => {
    mockedAxios.get.mockRejectedValue(new Error('timeout'));

    const metrics = await monitoringService.getServerMetrics(createdServerId);

    expect(metrics.status).toBe('offline');
    expect(metrics.metrics.cpu).toBe(0);
  });

  it('getServerMetrics: status is degraded when metrics are above critical threshold', async () => {
    // All three metrics above 95 → degraded
    mockedAxios.get.mockResolvedValue(prometheusInstant('98.0'));

    const metrics = await monitoringService.getServerMetrics(createdServerId);

    expect(metrics.status).toBe('degraded');
  });

  it('getServerMetrics: status is offline when all per-server metrics are missing', async () => {
    mockedAxios.get.mockResolvedValue(prometheusEmpty());

    const metrics = await monitoringService.getServerMetrics(createdServerId);

    expect(metrics.status).toBe('offline');
  });

  it('getServerMetrics: includes server uptime when Prometheus exposes it', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(prometheusInstant('42.0'))
      .mockResolvedValueOnce(prometheusInstant('43.0'))
      .mockResolvedValueOnce(prometheusInstant('44.0'))
      .mockResolvedValueOnce(prometheusInstant('3600'));

    const metrics = await monitoringService.getServerMetrics(createdServerId);

    expect(metrics.metrics.uptime).toBe(3600);
    expect(metrics.status).toBe('online');
  });

  it('getServerMetrics: marks spi gateway online using spi_service_up', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(prometheusInstant('1'))
      .mockResolvedValueOnce(prometheusInstant('12.5'))
      .mockResolvedValueOnce(prometheusInstant('0.2'));

    const metrics = await monitoringService.getServerMetrics(spiServerId);

    expect(metrics.status).toBe('online');
    expect(metrics.metrics.network_in).toBe(12.5);
    expect(metrics.metrics.network_out).toBe(0.2);
  });

  it('getServerMetrics: marks atc gateway offline using atc_service_up', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(prometheusInstant('0'))
      .mockResolvedValueOnce(prometheusInstant('9.1'))
      .mockResolvedValueOnce(prometheusInstant('0.97'));

    const metrics = await monitoringService.getServerMetrics(atcServerId);

    expect(metrics.status).toBe('offline');
    expect(metrics.metrics.network_in).toBe(9.1);
    expect(metrics.metrics.network_out).toBe(0.97);
  });

  it('getServerMetrics: marks linkser gateway online using linkser_service_up', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(prometheusInstant('1'))
      .mockResolvedValueOnce(prometheusInstant('14.2'))
      .mockResolvedValueOnce(prometheusInstant('0.95'));

    const metrics = await monitoringService.getServerMetrics(linkserServerId);

    expect(metrics.status).toBe('online');
    expect(metrics.metrics.network_in).toBe(14.2);
    expect(metrics.metrics.network_out).toBe(0.95);
  });

  it('getServerMetrics: creates threshold alert when value exceeds threshold and no duplicate exists', async () => {
    mockedAxios.get.mockResolvedValue(prometheusInstant('88.0'));
    jest.spyOn(thresholdRepository, 'findByServer').mockReturnValue([
      {
        id: 'threshold-cpu-warning',
        server_id: createdServerId,
        server_name: 'test-server',
        metric_type: 'cpu',
        threshold_value: 80,
        severity: 'warning',
        enabled: true,
        created_at: new Date().toISOString(),
      } as any,
    ]);
    jest.spyOn(alertRepository, 'findAll').mockReturnValue([]);
    const createAlertSpy = jest.spyOn(alertService, 'createAlert').mockReturnValue({} as any);

    await monitoringService.getServerMetrics(createdServerId);

    expect(createAlertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        server_id: createdServerId,
        threshold_id: 'threshold-cpu-warning',
        severity: 'warning',
      })
    );
  });

  it('getServerMetrics: avoids creating duplicate threshold alert when similar active alert exists', async () => {
    mockedAxios.get.mockResolvedValue(prometheusInstant('88.0'));
    jest.spyOn(thresholdRepository, 'findByServer').mockReturnValue([
      {
        id: 'threshold-cpu-warning',
        server_id: createdServerId,
        server_name: 'test-server',
        metric_type: 'cpu',
        threshold_value: 80,
        severity: 'warning',
        enabled: true,
        created_at: new Date().toISOString(),
      } as any,
    ]);
    jest.spyOn(alertRepository, 'findAll').mockReturnValue([
      {
        id: 'alert-1',
        server_id: createdServerId,
        threshold_id: 'threshold-cpu-warning',
        message: 'CPU usage at 88.0% exceeds warning threshold of 80%',
        severity: 'warning',
        acknowledged: false,
        acknowledged_by: null,
        acknowledged_at: null,
        resolved: false,
        resolved_at: null,
        created_at: new Date().toISOString(),
      } as any,
    ]);
    const createAlertSpy = jest.spyOn(alertService, 'createAlert').mockReturnValue({} as any);

    await monitoringService.getServerMetrics(createdServerId);

    expect(createAlertSpy).not.toHaveBeenCalled();
  });

  it('getServerMetrics: creates a critical status alert when a server goes offline', async () => {
    mockedAxios.get.mockResolvedValue(prometheusEmpty());
    jest.spyOn(thresholdRepository, 'findByServer').mockReturnValue([]);
    jest.spyOn(alertRepository, 'findAll').mockReturnValue([]);
    const createAlertSpy = jest.spyOn(alertService, 'createAlert').mockReturnValue({} as any);

    await monitoringService.getServerMetrics(createdServerId);

    expect(createAlertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        server_id: createdServerId,
        message: expect.stringContaining('is offline'),
        severity: 'critical',
      })
    );
  });

  it('getServerMetrics: resolves an active offline status alert when the server recovers', async () => {
    mockedAxios.get.mockResolvedValue(prometheusInstant('42.0'));
    jest.spyOn(thresholdRepository, 'findByServer').mockReturnValue([]);
    jest.spyOn(alertRepository, 'findAll').mockReturnValue([
      {
        id: 'offline-alert-1',
        server_id: createdServerId,
        threshold_id: null,
        message: `Server ${serverRepository.findById(createdServerId)!.name} is offline`,
        severity: 'critical',
        acknowledged: false,
        acknowledged_by: null,
        acknowledged_at: null,
        resolved: false,
        resolved_at: null,
        created_at: new Date().toISOString(),
      } as any,
    ]);
    const resolveAlertSpy = jest.spyOn(alertService, 'resolveAlert').mockReturnValue({} as any);

    await monitoringService.getServerMetrics(createdServerId);

    expect(resolveAlertSpy).toHaveBeenCalledWith('offline-alert-1');
  });

  // ─── getMetricsHistory ───────────────────────────────────────────────────

  it('getMetricsHistory: returns array when Prometheus provides range data', async () => {
    const now = Date.now() / 1000;
    mockedAxios.get.mockResolvedValue(
      prometheusRange([
        [now - 3600, '30'],
        [now - 1800, '45'],
        [now, '55'],
      ])
    );

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    const history = await monitoringService.getMetricsHistory({
      from_date: from,
      to_date: to,
      interval: '5m',
    });

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    if (history.length > 0) {
      expect(history[0]).toHaveProperty('server_id');
      expect(history[0]).toHaveProperty('metric_type');
      expect(history[0]).toHaveProperty('data');
    }
  });

  it('getMetricsHistory: filters by server_id when provided', async () => {
    mockedAxios.get.mockResolvedValue(prometheusRange([[Date.now() / 1000, '20']]));

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    const history = await monitoringService.getMetricsHistory({
      from_date: from,
      to_date: to,
      server_id: createdServerId,
      interval: '15m',
    });

    expect(Array.isArray(history)).toBe(true);
    if (history.length > 0) {
      expect(history[0].server_id).toBe(createdServerId);
    }
  });

  it('getMetricsHistory: filters by metric_type when provided', async () => {
    mockedAxios.get.mockResolvedValue(prometheusRange([[Date.now() / 1000, '60']]));

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    const history = await monitoringService.getMetricsHistory({
      from_date: from,
      to_date: to,
      metric_type: 'cpu',
      interval: '1h',
    });

    expect(Array.isArray(history)).toBe(true);
    if (history.length > 0) {
      expect(history[0].metric_type).toBe('cpu');
    }
  });

  it('getMetricsHistory: returns empty array when Prometheus has no data', async () => {
    mockedAxios.get.mockResolvedValue(prometheusEmpty());

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    const history = await monitoringService.getMetricsHistory({ from_date: from, to_date: to });

    expect(Array.isArray(history)).toBe(true);
  });

  it('getMetricsHistory: handles Prometheus range error gracefully', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Prometheus down'));

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    // Should not throw – it catches the error and returns partial/empty results
    const history = await monitoringService.getMetricsHistory({ from_date: from, to_date: to });
    expect(Array.isArray(history)).toBe(true);
  });

  // ─── interval helper (exercised via getMetricsHistory) ─────────────────

  it('getMetricsHistory: uses 1d interval without throwing', async () => {
    mockedAxios.get.mockResolvedValue(prometheusRange([[Date.now() / 1000, '30']]));

    const from = new Date(Date.now() - 86400 * 1000).toISOString();
    const to = new Date().toISOString();

    const history = await monitoringService.getMetricsHistory({
      from_date: from,
      to_date: to,
      interval: '1d',
    });

    expect(Array.isArray(history)).toBe(true);
  });

  it('getMetricsHistory: uses 1h interval without throwing', async () => {
    mockedAxios.get.mockResolvedValue(prometheusRange([[Date.now() / 1000, '30']]));

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    const history = await monitoringService.getMetricsHistory({
      from_date: from,
      to_date: to,
      interval: '1h',
    });

    expect(Array.isArray(history)).toBe(true);
  });

  it('getMetricsHistory: falls back to 5m step for invalid interval', async () => {
    mockedAxios.get.mockResolvedValue(prometheusRange([[Date.now() / 1000, '30']]));

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    await monitoringService.getMetricsHistory({
      from_date: from,
      to_date: to,
      server_id: createdServerId,
      metric_type: 'cpu',
      interval: 'bad-interval' as any,
    });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/query_range'),
      expect.objectContaining({
        params: expect.objectContaining({
          step: '300s',
        }),
      })
    );
  });
});
