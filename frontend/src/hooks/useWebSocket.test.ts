import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import useWebSocket from './useWebSocket';

type Handler = (...args: any[]) => void;

const socketState = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    socket: {
      on: vi.fn((event: string, handler: Handler) => {
        handlers.set(event, handler);
      }),
      emit: vi.fn(),
      disconnect: vi.fn(),
    },
    io: vi.fn(),
  };
});

vi.mock('socket.io-client', () => ({
  io: socketState.io,
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketState.handlers.clear();
    localStorage.clear();
    socketState.io.mockReturnValue(socketState.socket);
  });

  it('does not connect when disabled or token is missing', () => {
    renderHook(() => useWebSocket({ enabled: false }));
    expect(socketState.io).not.toHaveBeenCalled();

    renderHook(() => useWebSocket({ enabled: true }));
    expect(socketState.io).not.toHaveBeenCalled();
  });

  it('connects, subscribes and exposes connection state', async () => {
    localStorage.setItem('authToken', 'token-123');
    const onAlert = vi.fn();
    const onAlertAcknowledged = vi.fn();
    const onAlertResolved = vi.fn();

    const { result, unmount } = renderHook(() =>
      useWebSocket({ enabled: true, onAlert, onAlertAcknowledged, onAlertResolved })
    );

    expect(socketState.io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        path: '/ws',
        transports: ['websocket', 'polling'],
        auth: { token: 'token-123' },
      })
    );

    act(() => {
      socketState.handlers.get('connect')?.();
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(socketState.socket.emit).toHaveBeenCalledWith('subscribe:alerts');
    expect(socketState.socket.emit).toHaveBeenCalledWith('request:currentStatus');

    const alert = {
      id: 'a1',
      serverId: 'srv-1',
      serverName: 'srv-1',
      type: 'warning' as const,
      message: 'CPU high',
      timestamp: '2026-03-16T00:00:00.000Z',
      acknowledged: false,
    };

    act(() => {
      socketState.handlers.get('alert:new')?.(alert);
      socketState.handlers.get('alert:critical')?.(alert);
      socketState.handlers.get('alert:acknowledged')?.({ alertId: 'a1', acknowledgedBy: 'admin', timestamp: alert.timestamp });
      socketState.handlers.get('alert:resolved')?.({ alertId: 'a1', resolvedAt: alert.timestamp });
      socketState.handlers.get('disconnect')?.();
    });

    expect(onAlert).toHaveBeenCalledTimes(2);
    expect(onAlertAcknowledged).toHaveBeenCalledWith({
      alertId: 'a1',
      acknowledgedBy: 'admin',
      timestamp: alert.timestamp,
    });
    expect(onAlertResolved).toHaveBeenCalledWith({
      alertId: 'a1',
      resolvedAt: alert.timestamp,
    });
    await waitFor(() => expect(result.current.isConnected).toBe(false));

    unmount();
    expect(socketState.socket.disconnect).toHaveBeenCalled();
  });
});
