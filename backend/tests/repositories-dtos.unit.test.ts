/**
 * Unit Tests - Repositories and DTOs
 * Directly exercises UserRepository, AuditLogRepository, AlertDTO, ServerDTO
 */

import { userRepository } from '../src/repositories/UserRepository';
import { auditLogRepository } from '../src/repositories/AuditLogRepository';
import {
  validateCreateAlertDTO,
  validateCreateThresholdDTO,
  validateUpdateThresholdDTO,
} from '../src/dtos/AlertDTO';
import {
  validateCreateServerDTO,
  validateUpdateServerDTO,
} from '../src/dtos/ServerDTO';
import { hashPassword } from '../src/utils/passwordHasher';

const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ─── UserRepository ───────────────────────────────────────────────────────────

describe('UserRepository', () => {
  let createdUserId: string;

  it('findAll returns an array', () => {
    const users = userRepository.findAll();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(1); // at least admin
  });

  it('findByUsername returns admin user', () => {
    const user = userRepository.findByUsername('admin');
    expect(user).not.toBeNull();
    expect(user!.username).toBe('admin');
  });

  it('findByUsername returns null for unknown user', () => {
    expect(userRepository.findByUsername('nobody_' + uniq())).toBeFalsy();
  });

  it('findByEmail returns null when no match', () => {
    expect(userRepository.findByEmail('noone@nowhere.com')).toBeFalsy();
  });

  it('usernameExists returns true for admin', () => {
    expect(userRepository.usernameExists('admin')).toBe(true);
  });

  it('usernameExists returns false for unknown user', () => {
    expect(userRepository.usernameExists('ghost_' + uniq())).toBe(false);
  });

  it('create inserts a new user and returns it', async () => {
    const username = `repo_user_${uniq()}`;
    const password_hash = await hashPassword('TestPass123!');

    const user = userRepository.create({
      username,
      password: 'TestPass123!',
      password_hash,
      email: `${username}@test.com`,
    });

    expect(user).toHaveProperty('id');
    expect(user.username).toBe(username);
    createdUserId = user.id;
  });

  it('findById returns the created user', () => {
    const user = userRepository.findById(createdUserId);
    expect(user).not.toBeNull();
    expect(user!.id).toBe(createdUserId);
  });

  it('findByIdWithRoles returns user with roles array', () => {
    const user = userRepository.findByIdWithRoles(createdUserId);
    expect(user).not.toBeNull();
    expect(Array.isArray(user!.roles)).toBe(true);
  });

  it('findByIdWithRoles returns null for unknown ID', () => {
    expect(userRepository.findByIdWithRoles('unknown-uuid')).toBeNull();
  });

  it('findByUsernameWithRoles returns admin with ADMIN role', () => {
    const user = userRepository.findByUsernameWithRoles('admin');
    expect(user).not.toBeNull();
    const roleNames = user!.roles.map((r) => r.name);
    expect(roleNames).toContain('ADMIN');
  });

  it('findByEmail returns a user when email matches', async () => {
    const username = `email_repo_${uniq()}`;
    const email = `${username}@example.com`;
    const password_hash = await hashPassword('TestPass123!');
    userRepository.create({ username, password: 'TestPass123!', password_hash, email });

    const found = userRepository.findByEmail(email);
    expect(found).not.toBeNull();
    expect(found!.email).toBe(email);
  });

  it('update changes email and returns updated user', () => {
    const newEmail = `updated_${uniq()}@test.com`;
    const updated = userRepository.update(createdUserId, { email: newEmail });
    expect(updated).not.toBeNull();
    expect(updated!.email).toBe(newEmail);
  });

  it('update returns null for unknown ID', () => {
    const result = userRepository.update('unknown-uuid', { email: 'x@x.com' });
    expect(result).toBeNull();
  });

  it('updateLastLogin does not throw', () => {
    expect(() => userRepository.updateLastLogin(createdUserId)).not.toThrow();
  });

  it('getUserRoles returns an array', () => {
    const roles = userRepository.getUserRoles(createdUserId);
    expect(Array.isArray(roles)).toBe(true);
  });

  it('toSafeUser omits password_hash', () => {
    const user = userRepository.findById(createdUserId)!;
    const safe = userRepository.toSafeUser(user);
    expect(safe).not.toHaveProperty('password_hash');
    expect(safe).toHaveProperty('id');
    expect(safe).toHaveProperty('username');
  });

  it('delete removes the user', () => {
    const deleted = userRepository.delete(createdUserId);
    expect(deleted).toBe(true);
    expect(userRepository.findById(createdUserId)).toBeFalsy();
  });

  it('delete returns false for unknown ID', () => {
    expect(userRepository.delete('unknown-uuid')).toBe(false);
  });

  it('findAll supports limit/offset', () => {
    const page = userRepository.findAll(1, 0);
    expect(page.length).toBeLessThanOrEqual(1);
  });
});

// ─── AuditLogRepository ───────────────────────────────────────────────────────

describe('AuditLogRepository', () => {
  let logId: string;

  it('create inserts an audit log and returns it', () => {
    const log = auditLogRepository.create({
        action: 'SETTINGS_UPDATED',
      details: { key: 'value' },
      ip_address: '127.0.0.1',
    });

    expect(log).toHaveProperty('id');
      expect(log.action).toBe('SETTINGS_UPDATED');
    logId = log.id;
  });

  it('create works without optional fields', () => {
      const log = auditLogRepository.create({ action: 'LOGIN_FAILED' });
    expect(log).toHaveProperty('id');
  });

  it('create works with user_id', () => {
    const admin = userRepository.findByUsername('admin');
    const log = auditLogRepository.create({
      user_id: admin!.id,
        action: 'USER_UPDATED',
    });
    expect(log).toHaveProperty('id');
  });

  it('findById returns the created log', () => {
    const log = auditLogRepository.findById(logId);
    expect(log).not.toBeNull();
    expect(log!.id).toBe(logId);
  });

  it('findAll returns array', () => {
    const logs = auditLogRepository.findAll();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('findAll filters by action', () => {
    const logs = auditLogRepository.findAll({ action: 'SETTINGS_UPDATED' });
    expect(logs.every((l) => l.action === 'SETTINGS_UPDATED')).toBe(true);
  });

  it('findAll filters by user_id', () => {
    const admin = userRepository.findByUsername('admin')!;
    const logs = auditLogRepository.findAll({ user_id: admin.id });
    expect(Array.isArray(logs)).toBe(true);
  });

  it('findAll filters by date range', () => {
    const from = new Date(Date.now() - 60000).toISOString();
    const to = new Date().toISOString();
    const logs = auditLogRepository.findAll({ from_date: from, to_date: to });
    expect(Array.isArray(logs)).toBe(true);
  });

  it('findAll supports limit and offset', () => {
    const logs = auditLogRepository.findAll({ limit: 2, offset: 0 });
    expect(logs.length).toBeLessThanOrEqual(2);
  });

  it('getRecentActivity returns logs for a user', () => {
    const admin = userRepository.findByUsername('admin')!;
    const logs = auditLogRepository.getRecentActivity(admin.id, 5);
    expect(Array.isArray(logs)).toBe(true);
  });

  it('getActivityStats returns action counts', () => {
    const stats = auditLogRepository.getActivityStats();
    expect(Array.isArray(stats)).toBe(true);
    if (stats.length > 0) {
      expect(stats[0]).toHaveProperty('action');
      expect(stats[0]).toHaveProperty('count');
    }
  });

  it('getActivityStats with date range returns results', () => {
    const from = new Date(Date.now() - 86400 * 1000).toISOString();
    const to = new Date().toISOString();
    const stats = auditLogRepository.getActivityStats(from, to);
    expect(Array.isArray(stats)).toBe(true);
  });

  it('cleanOldLogs returns number of deleted rows (0 with fresh DB)', () => {
    const deleted = auditLogRepository.cleanOldLogs(1); // keep only last 1 day
    expect(typeof deleted).toBe('number');
    expect(deleted).toBeGreaterThanOrEqual(0);
  });
});

// ─── AlertDTO validators ──────────────────────────────────────────────────────

describe('validateCreateAlertDTO', () => {
  it('accepts valid payload', () => {
    const dto = validateCreateAlertDTO({
      server_id: 'srv-1',
      message: 'CPU usage critical',
      severity: 'critical',
    });
    expect(dto.server_id).toBe('srv-1');
    expect(dto.severity).toBe('critical');
  });

  it('defaults severity to warning when omitted', () => {
    const dto = validateCreateAlertDTO({ server_id: 'srv-2', message: 'Disk space low' });
    expect(dto.severity).toBe('warning');
  });

  it('throws when server_id is missing', () => {
    expect(() => validateCreateAlertDTO({ message: 'test msg' })).toThrow();
  });

  it('throws when message is too short', () => {
    expect(() => validateCreateAlertDTO({ server_id: 'srv-1', message: 'Hi' })).toThrow();
  });

  it('throws for invalid severity', () => {
    expect(() =>
      validateCreateAlertDTO({ server_id: 'srv-1', message: 'A valid message', severity: 'extreme' })
    ).toThrow();
  });

  it('throws when body is not an object', () => {
    expect(() => validateCreateAlertDTO(null)).toThrow();
    expect(() => validateCreateAlertDTO('string')).toThrow();
  });
});

describe('validateCreateThresholdDTO', () => {
  it('accepts valid payload', () => {
    const dto = validateCreateThresholdDTO({
      metric_type: 'cpu',
      threshold_value: 80,
      severity: 'warning',
    });
    expect(dto.metric_type).toBe('cpu');
    expect(dto.threshold_value).toBe(80);
  });

  it('throws when metric_type is invalid', () => {
    expect(() =>
      validateCreateThresholdDTO({ metric_type: 'temperature', threshold_value: 80 })
    ).toThrow();
  });

  it('throws when threshold_value is out of range', () => {
    expect(() =>
      validateCreateThresholdDTO({ metric_type: 'cpu', threshold_value: 110 })
    ).toThrow();
    expect(() =>
      validateCreateThresholdDTO({ metric_type: 'cpu', threshold_value: -5 })
    ).toThrow();
  });

  it('throws when threshold_value is not a number', () => {
    expect(() =>
      validateCreateThresholdDTO({ metric_type: 'cpu', threshold_value: 'high' })
    ).toThrow();
  });

  it('throws for invalid severity', () => {
    expect(() =>
      validateCreateThresholdDTO({ metric_type: 'memory', threshold_value: 85, severity: 'extreme' })
    ).toThrow();
  });

  it('defaults enabled to true', () => {
    const dto = validateCreateThresholdDTO({ metric_type: 'disk', threshold_value: 90 });
    expect(dto.enabled).toBe(true);
  });

  it('normalizes missing or empty server_id to null for global thresholds', () => {
    expect(
      validateCreateThresholdDTO({ metric_type: 'cpu', threshold_value: 80 }).server_id
    ).toBeNull();

    expect(
      validateCreateThresholdDTO({ server_id: '', metric_type: 'cpu', threshold_value: 80 }).server_id
    ).toBeNull();
  });

  it('throws when body is not an object', () => {
    expect(() => validateCreateThresholdDTO(null)).toThrow();
  });
});

describe('validateUpdateThresholdDTO', () => {
  it('returns empty object when no fields provided', () => {
    const dto = validateUpdateThresholdDTO({});
    expect(Object.keys(dto)).toHaveLength(0);
  });

  it('accepts partial update with severity', () => {
    const dto = validateUpdateThresholdDTO({ severity: 'critical' });
    expect(dto.severity).toBe('critical');
  });

  it('accepts enabled = false', () => {
    const dto = validateUpdateThresholdDTO({ enabled: false });
    expect(dto.enabled).toBe(false);
  });

  it('throws when threshold_value is out of range', () => {
    expect(() => validateUpdateThresholdDTO({ threshold_value: 150 })).toThrow();
  });

  it('throws when severity is invalid', () => {
    expect(() => validateUpdateThresholdDTO({ severity: 'ultra' })).toThrow();
  });

  it('throws when body is not an object', () => {
    expect(() => validateUpdateThresholdDTO(null)).toThrow();
  });
});

// ─── ServerDTO validators ─────────────────────────────────────────────────────

describe('validateCreateServerDTO', () => {
  it('accepts valid payload', () => {
    const dto = validateCreateServerDTO({
      name: 'Prod Server',
      ip_address: '192.168.1.1',
      type: 'application',
      environment: 'production',
    });
    expect(dto.name).toBe('Prod Server');
    expect(dto.type).toBe('application');
  });

  it('throws when name is too short', () => {
    expect(() => validateCreateServerDTO({ name: 'X' })).toThrow();
  });

  it('throws when type is invalid', () => {
    expect(() =>
      validateCreateServerDTO({ name: 'Valid Server', type: 'mainframe' })
    ).toThrow();
  });

  it('throws when environment is invalid', () => {
    expect(() =>
      validateCreateServerDTO({ name: 'Valid Server', environment: 'qa' })
    ).toThrow();
  });

  it('throws for non-string ip_address', () => {
    expect(() =>
      validateCreateServerDTO({ name: 'Server', ip_address: 12345 })
    ).toThrow();
  });

  it('throws when body is not an object', () => {
    expect(() => validateCreateServerDTO(null)).toThrow();
  });
});

describe('validateUpdateServerDTO', () => {
  it('returns empty object when no fields provided', () => {
    const dto = validateUpdateServerDTO({});
    expect(Object.keys(dto)).toHaveLength(0);
  });

  it('accepts partial name update', () => {
    const dto = validateUpdateServerDTO({ name: 'New Name' });
    expect(dto.name).toBe('New Name');
  });

  it('accepts valid status', () => {
    const dto = validateUpdateServerDTO({ status: 'offline' });
    expect(dto.status).toBe('offline');
  });

  it('throws when name is too short', () => {
    expect(() => validateUpdateServerDTO({ name: 'X' })).toThrow();
  });

  it('throws when type is invalid', () => {
    expect(() => validateUpdateServerDTO({ type: 'supercomputer' })).toThrow();
  });

  it('throws when environment is invalid', () => {
    expect(() => validateUpdateServerDTO({ environment: 'local' })).toThrow();
  });

  it('throws when status is invalid', () => {
    expect(() => validateUpdateServerDTO({ status: 'zombie' })).toThrow();
  });

  it('throws when body is not an object', () => {
    expect(() => validateUpdateServerDTO(null)).toThrow();
  });
});
