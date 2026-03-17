import { vi } from 'vitest';
import metricsService from './metricsService';
import api from './api';

const apiMock = vi.hoisted(() => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./api', () => apiMock);

describe('metricsService', () => {
  const mockedApi = vi.mocked(api);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps current metrics from the backend shape', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          servers: [
            {
              server_id: 'srv-1',
              server_name: 'server-1',
              status: 'online',
              metrics: {
                cpu: 20,
                memory: 30,
                disk: 40,
                network_in: 50,
                network_out: 60,
              },
              last_update: '2026-03-16T00:00:00.000Z',
            },
          ],
        },
      },
    });

    await expect(metricsService.getCurrent()).resolves.toEqual([
      {
        server_id: 'srv-1',
        server_name: 'server-1',
        status: 'online',
        cpu: 20,
        memory: 30,
        disk: 40,
        networkIn: 50,
        networkOut: 60,
        timestamp: '2026-03-16T00:00:00.000Z',
      },
    ]);
  });

  it('maps summary fields', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          total_servers: 4,
          servers_online: 3,
          servers_offline: 1,
          servers_degraded: 0,
          avg_cpu: 25,
          avg_memory: 35,
          avg_disk: 45,
          active_alerts: 2,
        },
      },
    });

    await expect(metricsService.getSummary()).resolves.toEqual({
      total_servers: 4,
      servers_online: 3,
      servers_offline: 1,
      servers_degraded: 0,
      average_cpu: 25,
      average_memory: 35,
      average_disk: 45,
      active_alerts: 2,
    });
  });

  it('gets metrics history with params', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          history: [{ server_id: 'srv-1', metric_type: 'cpu', data: [] }],
        },
      },
    });

    const params = { interval: '5m' as const };
    await expect(metricsService.getHistory(params)).resolves.toEqual([
      { server_id: 'srv-1', metric_type: 'cpu', data: [] },
    ]);
    expect(mockedApi.get).toHaveBeenCalledWith('/metrics/history', { params });
  });

  it('gets server history', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          serverId: 'srv-1',
          history: [{ server_id: 'srv-1', metric_type: 'memory', data: [] }],
        },
      },
    });

    await expect(metricsService.getServerHistory('srv-1', { interval: '1h' })).resolves.toEqual([
      { server_id: 'srv-1', metric_type: 'memory', data: [] },
    ]);
  });

  it('gets prometheus metrics payload', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { raw: true } },
    });

    await expect(metricsService.getPrometheusMetrics()).resolves.toEqual({
      success: true,
      data: { raw: true },
    });
  });
});
