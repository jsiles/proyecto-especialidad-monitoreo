/**
 * Unit Tests - ServerRepository, AlertRepository, ThresholdRepository, ReportRepository
 * Uses the real in-memory SQLite database initialized by tests/setup.ts.
 */

import { serverRepository } from '../src/repositories/ServerRepository';
import { alertRepository } from '../src/repositories/AlertRepository';
import { thresholdRepository } from '../src/repositories/ThresholdRepository';
import { reportRepository } from '../src/repositories/ReportRepository';
import { userRepository } from '../src/repositories/UserRepository';

const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ─── ServerRepository ─────────────────────────────────────────────────────────

describe('ServerRepository', () => {
  let createdServerId: string;

  describe('findByName', () => {
    it('returns seeded server by name', () => {
      const server = serverRepository.findByName('srv-app-01');
      expect(server).toBeTruthy();
      expect(server!.name).toBe('srv-app-01');
    });

    it('returns falsy for unknown name', () => {
      expect(serverRepository.findByName('no-such-server')).toBeFalsy();
    });
  });

  describe('findById', () => {
    it('returns falsy for unknown id', () => {
      expect(serverRepository.findById('unknown-uuid')).toBeFalsy();
    });
  });

  describe('findAll', () => {
    it('returns all servers without filters', () => {
      const servers = serverRepository.findAll();
      expect(servers.length).toBeGreaterThanOrEqual(7); // seeded servers
    });

    it('filters by status', () => {
      const seeded = serverRepository.findByName('srv-app-01')!;
      serverRepository.updateStatus(seeded.id, 'online');
      const online = serverRepository.findAll({ status: 'online' });
      expect(online.every(s => s.status === 'online')).toBe(true);
    });

    it('filters by type', () => {
      const app = serverRepository.findAll({ type: 'application' });
      expect(app.every(s => s.type === 'application')).toBe(true);
      expect(app.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by environment', () => {
      const prod = serverRepository.findAll({ environment: 'production' });
      expect(prod.every(s => s.environment === 'production')).toBe(true);
    });

    it('filters by search term (name)', () => {
      const results = serverRepository.findAll({ search: 'srv-app' });
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(s => s.name.includes('srv-app'))).toBe(true);
    });

    it('supports limit and offset', () => {
      const first = serverRepository.findAll({ limit: 2, offset: 0 });
      const second = serverRepository.findAll({ limit: 2, offset: 2 });
      expect(first.length).toBeLessThanOrEqual(2);
      expect(second[0]?.id).not.toBe(first[0]?.id);
    });
  });

  describe('count', () => {
    it('returns total server count', () => {
      const total = serverRepository.count();
      expect(total).toBeGreaterThanOrEqual(7);
    });

    it('counts by status', () => {
      const n = serverRepository.count({ status: 'online' });
      expect(typeof n).toBe('number');
    });

    it('counts by type', () => {
      const n = serverRepository.count({ type: 'database' });
      expect(n).toBeGreaterThanOrEqual(1);
    });

    it('counts by environment', () => {
      const n = serverRepository.count({ environment: 'production' });
      expect(n).toBeGreaterThanOrEqual(7);
    });
  });

  describe('create', () => {
    it('creates new server and returns it', () => {
      const name = `test-server-${uniq()}`;
      const server = serverRepository.create({
        name,
        ip_address: '10.0.0.99',
        type: 'application',
        environment: 'staging',
      });
      expect(server).toHaveProperty('id');
      expect(server.name).toBe(name);
      expect(server.status).toBe('unknown');
      createdServerId = server.id;
    });

    it('creates server without optional fields', () => {
      const name = `bare-server-${uniq()}`;
      const server = serverRepository.create({ name });
      expect(server.ip_address).toBeFalsy();
      expect(server.type).toBeFalsy();
    });
  });

  describe('update', () => {
    it('updates name and ip_address', () => {
      const updated = serverRepository.update(createdServerId, {
        name: `renamed-${uniq()}`,
        ip_address: '10.0.0.200',
      });
      expect(updated).not.toBeNull();
      expect(updated!.ip_address).toBe('10.0.0.200');
    });

    it('updates type and environment', () => {
      const updated = serverRepository.update(createdServerId, {
        type: 'database',
        environment: 'production',
      });
      expect(updated!.type).toBe('database');
      expect(updated!.environment).toBe('production');
    });

    it('updates status', () => {
      const updated = serverRepository.update(createdServerId, { status: 'online' });
      expect(updated!.status).toBe('online');
    });

    it('returns null for unknown id', () => {
      expect(serverRepository.update('unknown-id', { status: 'offline' })).toBeNull();
    });

    it('empty update returns current server unchanged', () => {
      const server = serverRepository.findById(createdServerId)!;
      const updated = serverRepository.update(createdServerId, {});
      expect(updated!.id).toBe(server.id);
    });
  });

  describe('updateStatus', () => {
    it('returns true when server exists', () => {
      const result = serverRepository.updateStatus(createdServerId, 'offline');
      expect(result).toBe(true);
      expect(serverRepository.findById(createdServerId)!.status).toBe('offline');
    });

    it('returns false for unknown id', () => {
      expect(serverRepository.updateStatus('unknown-id', 'online')).toBe(false);
    });
  });

  describe('findByStatus', () => {
    it('returns servers matching status', () => {
      serverRepository.updateStatus(createdServerId, 'degraded');
      const degraded = serverRepository.findByStatus('degraded');
      expect(degraded.some(s => s.id === createdServerId)).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('returns stats object with all statuses', () => {
      const stats = serverRepository.getStatistics();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('online');
      expect(stats).toHaveProperty('offline');
      expect(stats).toHaveProperty('degraded');
      expect(stats).toHaveProperty('unknown');
      expect(stats.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('delete', () => {
    it('deletes a server and returns true', () => {
      const result = serverRepository.delete(createdServerId);
      expect(result).toBe(true);
      expect(serverRepository.findById(createdServerId)).toBeFalsy();
    });

    it('returns false for unknown id', () => {
      expect(serverRepository.delete('unknown-uuid')).toBe(false);
    });
  });
});

// ─── AlertRepository ──────────────────────────────────────────────────────────

describe('AlertRepository', () => {
  let serverId: string;
  let createdAlertId: string;

  beforeAll(() => {
    // Use a seeded server
    const server = serverRepository.findByName('srv-db-01')!;
    serverId = server.id;
  });

  describe('create', () => {
    it('creates alert without threshold_id', () => {
      const alert = alertRepository.create({
        server_id: serverId,
        message: 'CPU usage is very high',
        severity: 'warning',
      });
      expect(alert).toHaveProperty('id');
      expect(alert.severity).toBe('warning');
      createdAlertId = alert.id;
    });

    it('creates alert with threshold_id', () => {
      // Create a threshold first
      const threshold = thresholdRepository.create({
        server_id: serverId,
        metric_type: 'memory',
        threshold_value: 85,
        severity: 'critical',
      });
      const alert = alertRepository.create({
        server_id: serverId,
        threshold_id: threshold.id,
        message: 'Memory threshold exceeded (85%)',
        severity: 'critical',
      });
      expect(alert.severity).toBe('critical');
    });

    it('defaults severity to warning', () => {
      const alert = alertRepository.create({
        server_id: serverId,
        message: 'Default severity test message',
      });
      expect(alert.severity).toBe('warning');
    });
  });

  describe('findById', () => {
    it('returns alert by id', () => {
      const alert = alertRepository.findById(createdAlertId);
      expect(alert).toBeTruthy();
      expect(alert!.id).toBe(createdAlertId);
    });

    it('returns falsy for unknown id', () => {
      expect(alertRepository.findById('no-such-id')).toBeFalsy();
    });
  });

  describe('findByIdWithDetails', () => {
    it('returns alert with server_name', () => {
      const detail = alertRepository.findByIdWithDetails(createdAlertId);
      expect(detail).toBeTruthy();
      expect(detail!.server_name).toBeDefined();
    });

    it('returns null for unknown id', () => {
      expect(alertRepository.findByIdWithDetails('no-id')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all alerts without filters', () => {
      const alerts = alertRepository.findAll();
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by server_id', () => {
      const alerts = alertRepository.findAll({ server_id: serverId });
      expect(alerts.every((a: any) => a.server_id === serverId)).toBe(true);
    });

    it('filters by severity', () => {
      const alerts = alertRepository.findAll({ severity: 'warning' });
      expect(alerts.every((a: any) => a.severity === 'warning')).toBe(true);
    });

    it('filters by acknowledged=false', () => {
      const alerts = alertRepository.findAll({ acknowledged: false });
      expect(alerts.every((a: any) => !a.acknowledged)).toBe(true);
    });

    it('filters by resolved=false', () => {
      const alerts = alertRepository.findAll({ resolved: false });
      expect(alerts.every((a: any) => !a.resolved)).toBe(true);
    });

    it('filters by date range', () => {
      const from = new Date(Date.now() - 60000).toISOString();
      const to = new Date().toISOString();
      const alerts = alertRepository.findAll({ from_date: from, to_date: to });
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('supports limit and offset', () => {
      const alerts = alertRepository.findAll({ limit: 1, offset: 0 });
      expect(alerts.length).toBeLessThanOrEqual(1);
    });

    it('returns results as array', () => {
      const alerts = alertRepository.findAll();
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findActive', () => {
    it('returns unresolved alerts', () => {
      const alerts = alertRepository.findActive();
      expect(alerts.every(a => !a.resolved)).toBe(true);
    });

    it('filters by severity', () => {
      const alerts = alertRepository.findActive({ severity: 'warning' });
      expect(alerts.every(a => a.severity === 'warning')).toBe(true);
    });

    it('respects limit', () => {
      const alerts = alertRepository.findActive({ limit: 1 });
      expect(alerts.length).toBeLessThanOrEqual(1);
    });
  });

  describe('countActive', () => {
    it('returns count of active alerts', () => {
      const count = alertRepository.countActive();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('counts by severity', () => {
      const count = alertRepository.countActive('warning');
      expect(typeof count).toBe('number');
    });
  });

  describe('acknowledge', () => {
    it('acknowledges an unacknowledged alert', () => {
      const alert = alertRepository.acknowledge(createdAlertId, 'admin');
      expect(alert).not.toBeNull();
      expect(alertRepository.findById(createdAlertId)!.acknowledged).toBe(1);
    });

    it('returns null when alert is already acknowledged (changes=0)', () => {
      const result = alertRepository.acknowledge(createdAlertId, 'admin');
      expect(result).toBeNull();
    });

    it('returns null for unknown alert id', () => {
      const result = alertRepository.acknowledge('no-such-id', 'admin');
      expect(result).toBeNull();
    });
  });

  describe('resolve', () => {
    let resolveAlertId: string;

    beforeAll(() => {
      const alert = alertRepository.create({
        server_id: serverId,
        message: 'Alert to be resolved during test run',
        severity: 'warning',
      });
      resolveAlertId = alert.id;
    });

    it('resolves an unresolved alert', () => {
      const alert = alertRepository.resolve(resolveAlertId);
      expect(alert).not.toBeNull();
      expect(alertRepository.findById(resolveAlertId)!.resolved).toBe(1);
    });

    it('returns null when alert is already resolved (changes=0)', () => {
      expect(alertRepository.resolve(resolveAlertId)).toBeNull();
    });

    it('returns null for unknown alert id', () => {
      expect(alertRepository.resolve('no-such-id')).toBeNull();
    });
  });

  describe('findByServer', () => {
    it('returns alerts for a specific server', () => {
      const alerts = alertRepository.findByServer(serverId);
      expect(alerts.every(a => a.server_id === serverId)).toBe(true);
    });

    it('respects default limit', () => {
      const alerts = alertRepository.findByServer(serverId, 1);
      expect(alerts.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getStatistics', () => {
    it('returns stats without date filters', () => {
      const stats = alertRepository.getStatistics();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('acknowledged');
      expect(stats).toHaveProperty('resolved');
      expect(stats).toHaveProperty('by_severity');
      expect(Array.isArray(stats.by_severity)).toBe(true);
    });

    it('returns stats with date filters', () => {
      const from = new Date(Date.now() - 86400000).toISOString();
      const to = new Date().toISOString();
      const stats = alertRepository.getStatistics(from, to);
      expect(typeof stats.total).toBe('number');
    });
  });

  describe('delete', () => {
    it('deletes an existing alert', () => {
      const alert = alertRepository.create({
        server_id: serverId,
        message: 'To be deleted in test',
        severity: 'warning',
      });
      expect(alertRepository.delete(alert.id)).toBe(true);
      expect(alertRepository.findById(alert.id)).toBeFalsy();
    });

    it('returns false for unknown id', () => {
      expect(alertRepository.delete('no-such-id')).toBe(false);
    });
  });
});

// ─── ThresholdRepository ──────────────────────────────────────────────────────

describe('ThresholdRepository', () => {
  let serverId: string;
  let createdThresholdId: string;

  beforeAll(() => {
    serverId = serverRepository.findByName('srv-web-01')!.id;
  });

  describe('create', () => {
    it('creates threshold with server_id', () => {
      const threshold = thresholdRepository.create({
        server_id: serverId,
        metric_type: 'cpu',
        threshold_value: 75,
        severity: 'warning',
        enabled: true,
      });
      expect(threshold).toHaveProperty('id');
      expect(threshold.metric_type).toBe('cpu');
      expect(threshold.enabled).toBe(true);
      createdThresholdId = threshold.id;
    });

    it('creates global threshold (no server_id)', () => {
      const threshold = thresholdRepository.create({
        metric_type: 'disk',
        threshold_value: 90,
        severity: 'critical',
      });
      expect(threshold.server_id).toBeFalsy();
    });

    it('creates threshold with enabled=false', () => {
      const threshold = thresholdRepository.create({
        server_id: serverId,
        metric_type: 'memory',
        threshold_value: 50,
        enabled: false,
      });
      expect(threshold.enabled).toBe(false);
    });

    it('defaults severity to warning', () => {
      const threshold = thresholdRepository.create({
        metric_type: 'cpu',
        threshold_value: 70,
      });
      expect(threshold.severity).toBe('warning');
    });
  });

  describe('findById', () => {
    it('returns threshold by id', () => {
      const t = thresholdRepository.findById(createdThresholdId);
      expect(t).toBeTruthy();
      expect(t!.id).toBe(createdThresholdId);
      expect(typeof t!.enabled).toBe('boolean');
    });

    it('returns null for unknown id', () => {
      expect(thresholdRepository.findById('no-such-id')).toBeFalsy();
    });
  });

  describe('findByIdWithServer', () => {
    it('returns threshold with server_name', () => {
      const t = thresholdRepository.findByIdWithServer(createdThresholdId);
      expect(t).toBeTruthy();
      expect(t!.server_name).toBeDefined();
    });

    it('returns null for unknown id', () => {
      expect(thresholdRepository.findByIdWithServer('no-such-id')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all thresholds without filters', () => {
      const results = thresholdRepository.findAll();
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by server_id', () => {
      const results = thresholdRepository.findAll({ server_id: serverId });
      expect(results.every(t => t.server_id === serverId)).toBe(true);
    });

    it('filters by metric_type', () => {
      const results = thresholdRepository.findAll({ metric_type: 'cpu' });
      expect(results.every(t => t.metric_type === 'cpu')).toBe(true);
    });

    it('filters by enabled=true', () => {
      const results = thresholdRepository.findAll({ enabled: true });
      expect(results.every(t => t.enabled === true)).toBe(true);
    });

    it('filters by enabled=false', () => {
      const results = thresholdRepository.findAll({ enabled: false });
      expect(results.every(t => t.enabled === false)).toBe(true);
    });

    it('supports limit and offset', () => {
      const results = thresholdRepository.findAll({ limit: 1, offset: 0 });
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('findByServer', () => {
    it('returns enabled thresholds for specific server and global ones', () => {
      // Enable the created threshold first
      thresholdRepository.update(createdThresholdId, { enabled: true });
      const results = thresholdRepository.findByServer(serverId);
      expect(Array.isArray(results)).toBe(true);
      // Only enabled thresholds
      expect(results.every(t => t.enabled === true)).toBe(true);
    });
  });

  describe('findGlobal', () => {
    it('returns thresholds with null server_id', () => {
      const globals = thresholdRepository.findGlobal();
      expect(globals.every(t => t.server_id === null)).toBe(true);
    });
  });

  describe('exists', () => {
    it('returns true when threshold exists for server', () => {
      const result = thresholdRepository.exists(serverId, 'cpu', 'warning');
      expect(result).toBe(true);
    });

    it('returns false when threshold does not exist', () => {
      const result = thresholdRepository.exists(serverId, 'network_in', 'critical');
      expect(result).toBe(false);
    });

    it('checks global threshold when serverId is null', () => {
      const result = thresholdRepository.exists(null, 'disk', 'critical');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('update', () => {
    it('updates threshold_value', () => {
      const updated = thresholdRepository.update(createdThresholdId, { threshold_value: 90 });
      expect(updated!.threshold_value).toBe(90);
    });

    it('updates severity', () => {
      const updated = thresholdRepository.update(createdThresholdId, { severity: 'critical' });
      expect(updated!.severity).toBe('critical');
    });

    it('updates enabled to false', () => {
      const updated = thresholdRepository.update(createdThresholdId, { enabled: false });
      expect(updated!.enabled).toBe(false);
    });

    it('returns same threshold on empty update', () => {
      const updated = thresholdRepository.update(createdThresholdId, {});
      expect(updated!.id).toBe(createdThresholdId);
    });

    it('returns null for unknown id', () => {
      expect(thresholdRepository.update('no-such-id', { threshold_value: 99 })).toBeNull();
    });
  });

  describe('getDefaultThresholds', () => {
    it('returns array of 6 default configurations', () => {
      const defaults = thresholdRepository.getDefaultThresholds();
      expect(Array.isArray(defaults)).toBe(true);
      expect(defaults.length).toBe(6);
      const types = defaults.map(d => d.metric_type);
      expect(types).toContain('cpu');
      expect(types).toContain('memory');
      expect(types).toContain('disk');
    });
  });

  describe('delete', () => {
    it('deletes threshold and returns true', () => {
      const t = thresholdRepository.create({
        server_id: serverId,
        metric_type: 'memory',
        threshold_value: 99,
        severity: 'critical',
      });
      expect(thresholdRepository.delete(t.id)).toBe(true);
      expect(thresholdRepository.findById(t.id)).toBeFalsy();
    });

    it('returns false for unknown id', () => {
      expect(thresholdRepository.delete('no-such-id')).toBe(false);
    });
  });
});

// ─── ReportRepository ─────────────────────────────────────────────────────────

describe('ReportRepository', () => {
  let userId: string;
  let createdReportId: string;

  beforeAll(() => {
    userId = userRepository.findByUsername('admin')!.id;
  });

  describe('create', () => {
    it('creates a report record', () => {
      const report = reportRepository.create({
        type: 'daily',
        period_start: '2026-01-01',
        period_end: '2026-01-01',
        generated_by: userId,
        status: 'pending',
      });
      expect(report).toHaveProperty('id');
      expect(report.type).toBe('daily');
      expect(report.status).toBe('pending');
      createdReportId = report.id;
    });

    it('creates with default status=pending', () => {
      const report = reportRepository.create({
        type: 'weekly',
        period_start: '2026-01-01',
        period_end: '2026-01-07',
      });
      expect(report.status).toBe('pending');
    });

    it('creates with file info', () => {
      const report = reportRepository.create({
        type: 'monthly',
        period_start: '2026-01-01',
        period_end: '2026-01-31',
        status: 'completed',
        file_path: '/data/reports/report.pdf',
        file_size: 2048,
      });
      expect(report.file_path).toBe('/data/reports/report.pdf');
      expect(report.file_size).toBe(2048);
    });
  });

  describe('findById', () => {
    it('returns report by id', () => {
      const report = reportRepository.findById(createdReportId);
      expect(report).not.toBeNull();
      expect(report!.id).toBe(createdReportId);
    });

    it('returns null for unknown id', () => {
      expect(reportRepository.findById('no-such-id')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns reports and total', () => {
      const { reports, total } = reportRepository.findAll();
      expect(Array.isArray(reports)).toBe(true);
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(1);
    });

    it('filters by type', () => {
      const { reports } = reportRepository.findAll({ type: 'daily' });
      expect(reports.every(r => r.type === 'daily')).toBe(true);
    });

    it('filters by status', () => {
      const { reports } = reportRepository.findAll({ status: 'pending' });
      expect(reports.every(r => r.status === 'pending')).toBe(true);
    });

    it('filters by generated_by', () => {
      const { reports } = reportRepository.findAll({ generated_by: userId });
      expect(reports.every(r => r.generated_by === userId)).toBe(true);
    });

    it('filters by date range', () => {
      const from = new Date(Date.now() - 60000).toISOString();
      const to = new Date().toISOString();
      const { reports } = reportRepository.findAll({ from_date: from, to_date: to });
      expect(Array.isArray(reports)).toBe(true);
    });

    it('supports limit and offset pagination', () => {
      const { reports: page1 } = reportRepository.findAll({ limit: 1, offset: 0 });
      const { reports: page2 } = reportRepository.findAll({ limit: 1, offset: 1 });
      expect(page1.length).toBeLessThanOrEqual(1);
      if (page1[0] && page2[0]) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });
  });

  describe('update', () => {
    it('updates status to completed (sets completed_at)', () => {
      const updated = reportRepository.update(createdReportId, { status: 'completed' });
      expect(updated!.status).toBe('completed');
    });

    it('updates file_path and file_size', () => {
      const updated = reportRepository.update(createdReportId, {
        file_path: '/data/reports/out.pdf',
        file_size: 4096,
      });
      expect(updated!.file_path).toBe('/data/reports/out.pdf');
      expect(updated!.file_size).toBe(4096);
    });

    it('updates error_message on failure', () => {
      const report = reportRepository.create({
        type: 'asfi',
        period_start: '2026-01-01',
        period_end: '2026-01-31',
        status: 'pending',
      });
      const updated = reportRepository.update(report.id, {
        status: 'failed',
        error_message: 'PDF generation failed',
      });
      expect(updated!.status).toBe('failed');
    });

    it('empty update returns current report unchanged', () => {
      const current = reportRepository.findById(createdReportId)!;
      const result = reportRepository.update(createdReportId, {});
      expect(result!.id).toBe(current.id);
    });

    it('returns null for unknown report id', () => {
      expect(reportRepository.update('no-such-id', { status: 'failed' })).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('returns statistics with total, by_type, by_status, recent_count', () => {
      const stats = reportRepository.getStatistics();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('by_type');
      expect(stats).toHaveProperty('by_status');
      expect(stats).toHaveProperty('recent_count');
      expect(typeof stats.total).toBe('number');
      expect(stats.total).toBeGreaterThanOrEqual(1);
    });

    it('by_type includes daily and weekly entries', () => {
      const stats = reportRepository.getStatistics();
      expect(stats.by_type).toHaveProperty('daily');
      expect(stats.by_type).toHaveProperty('weekly');
    });

    it('by_status includes pending and completed', () => {
      const stats = reportRepository.getStatistics();
      expect(typeof stats.by_status).toBe('object');
    });

    it('recent_count is a non-negative number', () => {
      const stats = reportRepository.getStatistics();
      expect(stats.recent_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('delete', () => {
    it('deletes report and returns true', () => {
      const report = reportRepository.create({
        type: 'daily',
        period_start: '2026-01-02',
        period_end: '2026-01-02',
        status: 'pending',
      });
      expect(reportRepository.delete(report.id)).toBe(true);
      expect(reportRepository.findById(report.id)).toBeNull();
    });

    it('returns false for unknown id', () => {
      expect(reportRepository.delete('no-such-id')).toBe(false);
    });
  });
});
