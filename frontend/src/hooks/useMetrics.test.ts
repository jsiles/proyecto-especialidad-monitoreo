import { renderHook, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import useMetrics from './useMetrics';

const serviceMock = vi.hoisted(() => ({
  metricsService: {
    getCurrent: vi.fn(),
    getSummary: vi.fn(),
    getServerHistory: vi.fn(),
  },
}));

const apiMock = vi.hoisted(() => ({
  getErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error'
  ),
}));

vi.mock('../services/metricsService', () => ({
  default: serviceMock.metricsService,
  metricsService: serviceMock.metricsService,
}));

vi.mock('../services/api', () => apiMock);

describe('useMetrics', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    serviceMock.metricsService.getCurrent.mockResolvedValue([
      { server_id: 'srv-1', cpu: 10, memory: 20, disk: 30 },
    ]);
    serviceMock.metricsService.getSummary.mockResolvedValue({
      total_servers: 1,
      average_cpu: 10,
    });
    serviceMock.metricsService.getServerHistory.mockResolvedValue([
      { server_id: 'srv-1', metric_type: 'cpu', data: [] },
    ]);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('auto-fetches metrics and summary', async () => {
    const { result } = renderHook(() => useMetrics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(serviceMock.metricsService.getCurrent).toHaveBeenCalled();
    expect(serviceMock.metricsService.getSummary).toHaveBeenCalled();
    expect(result.current.metrics).toEqual([{ server_id: 'srv-1', cpu: 10, memory: 20, disk: 30 }]);
    expect(result.current.summary).toEqual({ total_servers: 1, average_cpu: 10 });
  });

  it('handles fetchServerHistory errors', async () => {
    serviceMock.metricsService.getServerHistory.mockRejectedValue(new Error('History error'));
    const { result } = renderHook(() => useMetrics(false));

    await act(async () => {
      const history = await result.current.fetchServerHistory('srv-1');
      expect(history).toEqual([]);
    });

    expect(result.current.error).toBe('History error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('refreshes on an interval', async () => {
    vi.useFakeTimers();
    renderHook(() => useMetrics(true, 1000));

    expect(serviceMock.metricsService.getCurrent).toHaveBeenCalledTimes(1);
    expect(serviceMock.metricsService.getSummary).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(serviceMock.metricsService.getCurrent).toHaveBeenCalledTimes(2);
    expect(serviceMock.metricsService.getSummary).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
