import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { RealtimeAlertsBridge } from './RealtimeAlertsBridge';

const deps = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useWebSocket: vi.fn(),
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: deps.useAuth,
}));

vi.mock('../../hooks/useWebSocket', () => ({
  default: deps.useWebSocket,
}));

vi.mock('sonner', () => ({
  toast: deps.toast,
}));

describe('RealtimeAlertsBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.__monitoringRealtimeConnected = undefined;
    deps.useAuth.mockReturnValue({ isAuthenticated: true });
  });

  it('wires websocket callbacks and dispatches alert events', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    let options: any;

    deps.useWebSocket.mockImplementation((receivedOptions: any) => {
      options = receivedOptions;
      return { isConnected: true };
    });

    render(<RealtimeAlertsBridge />);

    expect(deps.useWebSocket).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );

    const alert = {
      id: 'a1',
      serverId: 'srv-1',
      serverName: 'server-1',
      type: 'critical',
      message: 'CPU high',
      timestamp: '2026-03-16T00:00:00.000Z',
      acknowledged: false,
    };

    options.onConnectionChange(true);
    options.onAlert(alert);
    options.onAlertAcknowledged({ alertId: 'a1', acknowledgedBy: 'admin', timestamp: alert.timestamp });
    options.onAlertResolved({ alertId: 'a1', resolvedAt: alert.timestamp });

    expect(dispatchSpy).toHaveBeenCalledTimes(4);
    expect(window.__monitoringRealtimeConnected).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'monitoring:websocket-status',
      })
    );
    expect(deps.toast.error).toHaveBeenCalledWith('server-1: CPU high');
  });

  it('uses the matching toast severity', () => {
    let options: any;
    deps.useWebSocket.mockImplementation((receivedOptions: any) => {
      options = receivedOptions;
      return { isConnected: false };
    });

    render(<RealtimeAlertsBridge />);

    options.onAlert({
      id: 'a2',
      serverId: 'srv-2',
      serverName: 'server-2',
      type: 'warning',
      message: 'Warning',
      timestamp: '2026-03-16T00:00:00.000Z',
      acknowledged: false,
    });
    options.onAlert({
      id: 'a3',
      serverId: 'srv-3',
      serverName: 'server-3',
      type: 'info',
      message: 'Info',
      timestamp: '2026-03-16T00:00:00.000Z',
      acknowledged: false,
    });

    expect(deps.toast.warning).toHaveBeenCalledWith('server-2: Warning');
    expect(deps.toast.info).toHaveBeenCalledWith('server-3: Info');
  });
});
