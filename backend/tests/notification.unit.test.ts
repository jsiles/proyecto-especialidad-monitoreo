/**
 * Unit Tests - NotificationService
 * Mocks WebSocketGateway and EmailService so no real I/O occurs
 */

import { notificationService } from '../src/services/NotificationService';

// ─── Mock the gateway ─────────────────────────────────────────────────────────

const mockGateway = {
  emitAlert: jest.fn(),
  emitAlertAcknowledged: jest.fn(),
  emitAlertResolved: jest.fn(),
  emitDashboardUpdate: jest.fn(),
  emitMetricUpdate: jest.fn(),
  emitServerStatusChange: jest.fn(),
};

// ─── Mock EmailService ────────────────────────────────────────────────────────

jest.mock('../src/services/EmailService', () => ({
  __esModule: true,
  default: {
    sendCriticalAlertNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const emailService = require('../src/services/EmailService').default;

// ─── Helper fixtures ──────────────────────────────────────────────────────────

function makeAlert(overrides = {}) {
  return {
    id: 'alert-1',
    server_id: 'srv-1',
    server_name: 'Web Server',
    threshold_id: 'thresh-1',
    message: 'CPU above 80%',
    severity: 'warning' as const,
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved: false,
    resolved_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMetricsSnapshot(servers: any[]) {
  return {
    timestamp: new Date().toISOString(),
    servers,
    summary: {
      total_servers: servers.length,
      servers_online: servers.length,
      servers_offline: 0,
      servers_degraded: 0,
      avg_cpu: 40,
      avg_memory: 50,
      avg_disk: 30,
      active_alerts: 0,
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationService (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationService.setGateway(mockGateway as any);
  });

  // ─── setGateway ─────────────────────────────────────────────────────────

  it('setGateway: does not throw when called with a valid gateway', () => {
    expect(() => notificationService.setGateway(mockGateway as any)).not.toThrow();
  });

  // ─── emitAlertCreated ────────────────────────────────────────────────────

  it('emitAlertCreated: calls gateway.emitAlert with correct payload', () => {
    const alert = makeAlert({ severity: 'warning' });

    notificationService.emitAlertCreated(alert);

    expect(mockGateway.emitAlert).toHaveBeenCalledTimes(1);
    const payload = mockGateway.emitAlert.mock.calls[0][0];
    expect(payload.id).toBe(alert.id);
    expect(payload.serverId).toBe(alert.server_id);
    expect(payload.serverName).toBe(alert.server_name);
    expect(payload.type).toBe('warning');
    expect(payload.acknowledged).toBe(false);
  });

  it('emitAlertCreated: does NOT send email for warning alerts', () => {
    notificationService.emitAlertCreated(makeAlert({ severity: 'warning' }));
    expect(emailService.sendCriticalAlertNotification).not.toHaveBeenCalled();
  });

  it('emitAlertCreated: sends email for critical alerts', async () => {
    notificationService.emitAlertCreated(makeAlert({ severity: 'critical' }));

    // Let the async email call fire (it's a void-async inside the function)
    await new Promise((resolve) => setImmediate(resolve));

    expect(emailService.sendCriticalAlertNotification).toHaveBeenCalledTimes(1);
  });

  it('emitAlertCreated: works without gateway (no throw)', () => {
    notificationService.setGateway(null as any);
    expect(() => notificationService.emitAlertCreated(makeAlert())).not.toThrow();
  });

  // ─── emitAlertAcknowledged ───────────────────────────────────────────────

  it('emitAlertAcknowledged: calls gateway.emitAlertAcknowledged', () => {
    const alert = makeAlert({
      acknowledged: true,
      acknowledged_by: 'admin',
      acknowledged_at: new Date().toISOString(),
    });

    notificationService.emitAlertAcknowledged(alert);

    expect(mockGateway.emitAlertAcknowledged).toHaveBeenCalledTimes(1);
    const payload = mockGateway.emitAlertAcknowledged.mock.calls[0][0];
    expect(payload.alertId).toBe(alert.id);
    expect(payload.acknowledgedBy).toBe('admin');
  });

  it('emitAlertAcknowledged: works without gateway (no throw)', () => {
    notificationService.setGateway(null as any);
    expect(() => notificationService.emitAlertAcknowledged(makeAlert())).not.toThrow();
  });

  // ─── emitAlertResolved ───────────────────────────────────────────────────

  it('emitAlertResolved: calls gateway.emitAlertResolved', () => {
    const alert = makeAlert({
      resolved: true,
      resolved_at: new Date().toISOString(),
    });

    notificationService.emitAlertResolved(alert);

    expect(mockGateway.emitAlertResolved).toHaveBeenCalledTimes(1);
    const payload = mockGateway.emitAlertResolved.mock.calls[0][0];
    expect(payload.alertId).toBe(alert.id);
  });

  it('emitAlertResolved: uses current time when resolved_at is null', () => {
    const alert = makeAlert({ resolved_at: null });
    notificationService.emitAlertResolved(alert);
    expect(mockGateway.emitAlertResolved).toHaveBeenCalledTimes(1);
  });

  it('emitAlertResolved: works without gateway (no throw)', () => {
    notificationService.setGateway(null as any);
    expect(() => notificationService.emitAlertResolved(makeAlert())).not.toThrow();
  });

  // ─── emitMonitoringSnapshot ──────────────────────────────────────────────

  it('emitMonitoringSnapshot: calls gateway.emitDashboardUpdate', () => {
    const snapshot = makeMetricsSnapshot([
      {
        server_id: 'srv-1',
        server_name: 'Web Server',
        status: 'online',
        metrics: { cpu: 40, memory: 50, disk: 30, network_in: 100, network_out: 80 },
        last_update: new Date().toISOString(),
      },
    ]);

    notificationService.emitMonitoringSnapshot(snapshot);

    expect(mockGateway.emitDashboardUpdate).toHaveBeenCalledTimes(1);
    expect(mockGateway.emitMetricUpdate).toHaveBeenCalledTimes(1);
  });

  it('emitMonitoringSnapshot: emits server status change when status differs', () => {
    // First snapshot → records status as 'online'
    const snapshot1 = makeMetricsSnapshot([
      {
        server_id: 'srv-status',
        server_name: 'Status Server',
        status: 'online',
        metrics: { cpu: 10, memory: 20, disk: 15, network_in: 0, network_out: 0 },
        last_update: new Date().toISOString(),
      },
    ]);
    notificationService.emitMonitoringSnapshot(snapshot1);

    jest.clearAllMocks();

    // Second snapshot → status changed to 'degraded'
    const snapshot2 = makeMetricsSnapshot([
      {
        server_id: 'srv-status',
        server_name: 'Status Server',
        status: 'degraded',
        metrics: { cpu: 97, memory: 98, disk: 99, network_in: 0, network_out: 0 },
        last_update: new Date().toISOString(),
      },
    ]);
    notificationService.emitMonitoringSnapshot(snapshot2);

    expect(mockGateway.emitServerStatusChange).toHaveBeenCalledTimes(1);
    const call = mockGateway.emitServerStatusChange.mock.calls[0][0];
    expect(call.previousStatus).toBe('online');
    expect(call.currentStatus).toBe('degraded');
  });

  it('emitMonitoringSnapshot: does NOT emit status change when status is same', () => {
    const snapshot = makeMetricsSnapshot([
      {
        server_id: 'srv-same',
        server_name: 'Same Server',
        status: 'online',
        metrics: { cpu: 20, memory: 30, disk: 10, network_in: 0, network_out: 0 },
        last_update: new Date().toISOString(),
      },
    ]);

    // Two identical snapshots → no change event on second
    notificationService.emitMonitoringSnapshot(snapshot);
    jest.clearAllMocks();
    notificationService.emitMonitoringSnapshot(snapshot);

    expect(mockGateway.emitServerStatusChange).not.toHaveBeenCalled();
  });

  it('emitMonitoringSnapshot: works without gateway (no throw)', () => {
    notificationService.setGateway(null as any);
    const snapshot = makeMetricsSnapshot([]);
    expect(() => notificationService.emitMonitoringSnapshot(snapshot)).not.toThrow();
  });
});
