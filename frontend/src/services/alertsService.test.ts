import { vi } from 'vitest';
import alertsService from './alertsService';
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

describe('alertsService', () => {
  const mockedApi = vi.mocked(api);
  const alert = {
    id: 'alert-1',
    server_id: 'srv-1',
    message: 'CPU high',
    severity: 'warning',
    resolved: false,
    acknowledged: false,
    created_at: '2026-03-16T00:00:00.000Z',
  } as const;
  const threshold = {
    id: 'thr-1',
    server_id: 'srv-1',
    metric_type: 'cpu',
    threshold_value: 80,
    severity: 'warning',
    created_at: '2026-03-16T00:00:00.000Z',
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets all alerts', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { alerts: [alert], total: 1 } },
    });

    await expect(alertsService.getAll({ limit: 10 })).resolves.toEqual({
      alerts: [alert],
      total: 1,
    });
  });

  it('gets active alerts', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { alerts: [alert] } },
    });

    await expect(alertsService.getActive()).resolves.toEqual([alert]);
  });

  it('gets one alert', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { alert } },
    });

    await expect(alertsService.getById('alert-1')).resolves.toEqual(alert);
  });

  it('acknowledges and resolves alerts', async () => {
    mockedApi.put.mockResolvedValue({
      data: { success: true, data: { alert: { ...alert, acknowledged: true } } },
    });

    await expect(alertsService.acknowledge('alert-1')).resolves.toEqual({
      ...alert,
      acknowledged: true,
    });

    mockedApi.put.mockResolvedValueOnce({
      data: { success: true, data: { alert: { ...alert, resolved: true } } },
    });

    await expect(alertsService.resolve('alert-1')).resolves.toEqual({
      ...alert,
      resolved: true,
    });
  });

  it('gets thresholds and creates/updates/deletes one', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { thresholds: [threshold] } },
    });
    mockedApi.post.mockResolvedValue({
      data: { success: true, data: { threshold } },
    });
    mockedApi.put.mockResolvedValue({
      data: { success: true, data: { threshold: { ...threshold, threshold_value: 90 } } },
    });
    mockedApi.delete.mockResolvedValue({});

    await expect(alertsService.getThresholds()).resolves.toEqual([threshold]);
    await expect(
      alertsService.createThreshold({
        server_id: 'srv-1',
        metric_type: 'cpu',
        threshold_value: 80,
        severity: 'warning',
      })
    ).resolves.toEqual(threshold);
    await expect(
      alertsService.updateThreshold('thr-1', { threshold_value: 90 })
    ).resolves.toEqual({ ...threshold, threshold_value: 90 });

    await alertsService.deleteThreshold('thr-1');

    expect(mockedApi.delete).toHaveBeenCalledWith('/alerts/thresholds/thr-1');
  });
});
