import { renderHook, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import useAlerts from './useAlerts';

const serviceMock = vi.hoisted(() => ({
  alertsService: {
    getAll: vi.fn(),
    getActive: vi.fn(),
    getThresholds: vi.fn(),
    acknowledge: vi.fn(),
    resolve: vi.fn(),
    createThreshold: vi.fn(),
    deleteThreshold: vi.fn(),
  },
}));

const apiMock = vi.hoisted(() => ({
  getErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error'
  ),
}));

vi.mock('../services/alertsService', () => ({
  default: serviceMock.alertsService,
  alertsService: serviceMock.alertsService,
}));

vi.mock('../services/api', () => apiMock);

describe('useAlerts', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const alert = {
    id: 'alert-1',
    server_id: 'srv-1',
    message: 'CPU high',
    severity: 'warning',
    resolved: false,
    acknowledged: false,
    created_at: '2026-03-16T00:00:00.000Z',
  };
  const threshold = {
    id: 'thr-1',
    server_id: 'srv-1',
    metric_type: 'cpu',
    threshold_value: 80,
    severity: 'warning',
    created_at: '2026-03-16T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    serviceMock.alertsService.getAll.mockResolvedValue({ alerts: [alert], total: 1 });
    serviceMock.alertsService.getActive.mockResolvedValue([alert]);
    serviceMock.alertsService.getThresholds.mockResolvedValue([threshold]);
    serviceMock.alertsService.acknowledge.mockResolvedValue({ ...alert, acknowledged: true });
    serviceMock.alertsService.resolve.mockResolvedValue({ ...alert, resolved: true });
    serviceMock.alertsService.createThreshold.mockResolvedValue(threshold);
    serviceMock.alertsService.deleteThreshold.mockResolvedValue(undefined);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('auto-fetches alerts, active alerts and thresholds', async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => expect(result.current.alerts).toEqual([alert]));

    expect(result.current.activeAlerts).toEqual([alert]);
    expect(result.current.thresholds).toEqual([threshold]);
  });

  it('acknowledges, resolves, creates and deletes threshold state', async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => expect(result.current.activeAlerts).toEqual([alert]));

    await act(async () => {
      await result.current.acknowledgeAlert('alert-1');
    });

    expect(result.current.activeAlerts[0].acknowledged).toBe(true);

    await act(async () => {
      await result.current.resolveAlert('alert-1');
    });

    expect(result.current.activeAlerts).toEqual([]);

    await act(async () => {
      await result.current.createThreshold({
        server_id: 'srv-1',
        metric_type: 'cpu',
        threshold_value: 80,
        severity: 'warning',
      });
    });

    expect(result.current.thresholds).toHaveLength(2);

    await act(async () => {
      await result.current.deleteThreshold('thr-1');
    });

    expect(result.current.thresholds).toHaveLength(0);
  });

  it('reacts to browser alert events', async () => {
    const { result } = renderHook(() => useAlerts(false));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('monitoring:alert-new', {
          detail: {
            id: 'alert-2',
            serverId: 'srv-2',
            serverName: 'server-2',
            type: 'critical',
            message: 'Disk full',
            timestamp: '2026-03-16T00:00:00.000Z',
            acknowledged: false,
          },
        })
      );
    });

    expect(result.current.activeAlerts[0].id).toBe('alert-2');

    act(() => {
      window.dispatchEvent(
        new CustomEvent('monitoring:alert-acknowledged', {
          detail: { alertId: 'alert-2', timestamp: '2026-03-16T00:00:00.000Z' },
        })
      );
    });

    expect(result.current.activeAlerts[0].acknowledged).toBe(true);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('monitoring:alert-resolved', {
          detail: { alertId: 'alert-2', resolvedAt: '2026-03-16T00:00:00.000Z' },
        })
      );
    });

    expect(result.current.activeAlerts).toEqual([]);
  });

  it('captures service errors', async () => {
    serviceMock.alertsService.getActive.mockRejectedValue(new Error('Active failed'));
    const { result } = renderHook(() => useAlerts(false));

    await act(async () => {
      await result.current.fetchActiveAlerts();
    });

    expect(result.current.error).toBe('Active failed');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('handles fetchAlerts and fetchThresholds errors', async () => {
    serviceMock.alertsService.getAll.mockRejectedValue(new Error('Alerts failed'));
    serviceMock.alertsService.getThresholds.mockRejectedValue(new Error('Thresholds failed'));
    const { result } = renderHook(() => useAlerts(false));

    await act(async () => {
      await result.current.fetchAlerts();
    });
    expect(result.current.error).toBe('Alerts failed');
    expect(result.current.alerts).toEqual([]);

    await act(async () => {
      await result.current.fetchThresholds();
    });
    expect(result.current.error).toBe('Thresholds failed');
    expect(result.current.thresholds).toEqual([]);
  });

  it('returns false or null when alert mutations fail', async () => {
    const { result } = renderHook(() => useAlerts(false));

    serviceMock.alertsService.acknowledge.mockRejectedValue(new Error('Ack failed'));
    serviceMock.alertsService.resolve.mockRejectedValue(new Error('Resolve failed'));
    serviceMock.alertsService.createThreshold.mockRejectedValue(new Error('Create threshold failed'));
    serviceMock.alertsService.deleteThreshold.mockRejectedValue(new Error('Delete threshold failed'));

    await expect(result.current.acknowledgeAlert('alert-1')).resolves.toBe(false);
    await waitFor(() => expect(result.current.error).toBe('Ack failed'));

    await expect(result.current.resolveAlert('alert-1')).resolves.toBe(false);
    await waitFor(() => expect(result.current.error).toBe('Resolve failed'));

    await expect(
      result.current.createThreshold({
        server_id: 'srv-1',
        metric_type: 'cpu',
        threshold_value: 95,
        severity: 'critical',
      })
    ).resolves.toBeNull();
    await waitFor(() => expect(result.current.error).toBe('Create threshold failed'));

    await expect(result.current.deleteThreshold('thr-1')).resolves.toBe(false);
    await waitFor(() => expect(result.current.error).toBe('Delete threshold failed'));
  });

  it('refreshes active alerts on an interval', async () => {
    vi.useFakeTimers();
    renderHook(() => useAlerts(false, 1000));

    expect(serviceMock.alertsService.getActive).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(serviceMock.alertsService.getActive).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
