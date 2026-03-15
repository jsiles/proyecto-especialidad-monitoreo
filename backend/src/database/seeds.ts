/**
 * Database Seeds
 * Initial data for the monitoring platform
 */

import { getDatabase } from './connection';
import { hashPassword } from '../utils/passwordHasher';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed default users
 */
export async function seedUsers(): Promise<void> {
  const db = getDatabase();
  
  // Check if admin exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (existingAdmin) {
    logger.info('Admin user already exists, skipping seed');
    return;
  }

  const adminPassword = await hashPassword('admin123');
  const operatorPassword = await hashPassword('operator123');

  const adminId = uuidv4();
  const operatorId = uuidv4();
  const now = new Date().toISOString();

  // Create admin user
  db.prepare(`
    INSERT INTO users (id, username, password_hash, email, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'admin', adminPassword, 'admin@monitoring.local', now);

  // Create operator user
  db.prepare(`
    INSERT INTO users (id, username, password_hash, email, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(operatorId, 'operator', operatorPassword, 'operator@monitoring.local', now);

  // Assign roles
  db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(adminId, 'role-admin');
  db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(operatorId, 'role-operator');

  logger.info('Users seeded successfully', { admin: adminId, operator: operatorId });
}

/**
 * Seed default servers
 */
export function seedServers(): void {
  const db = getDatabase();
  
  // Check if servers exist
  const count = db.prepare('SELECT COUNT(*) as count FROM servers').get() as { count: number };
  if (count.count > 0) {
    logger.info('Servers already exist, skipping seed');
    return;
  }

  const now = new Date().toISOString();
  const servers = [
    { name: 'srv-app-01', ip_address: '192.168.1.10', type: 'application', environment: 'production' },
    { name: 'srv-app-02', ip_address: '192.168.1.11', type: 'application', environment: 'production' },
    { name: 'srv-db-01', ip_address: '192.168.1.20', type: 'database', environment: 'production' },
    { name: 'srv-web-01', ip_address: '192.168.1.30', type: 'web', environment: 'production' },
    { name: 'srv-cache-01', ip_address: '192.168.1.40', type: 'cache', environment: 'production' },
    { name: 'spi-gateway', ip_address: '10.0.0.100', type: 'spi', environment: 'production' },
    { name: 'atc-gateway', ip_address: '10.0.0.101', type: 'atc', environment: 'production' },
  ];

  const stmt = db.prepare(`
    INSERT INTO servers (id, name, ip_address, type, environment, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'unknown', ?)
  `);

  for (const server of servers) {
    const id = uuidv4();
    stmt.run(id, server.name, server.ip_address, server.type, server.environment, now);
  }

  logger.info('Servers seeded successfully', { count: servers.length });
}

/**
 * Seed default alert thresholds
 */
export function seedThresholds(): void {
  const db = getDatabase();
  
  // Check if thresholds exist
  const count = db.prepare('SELECT COUNT(*) as count FROM alert_thresholds').get() as { count: number };
  if (count.count > 0) {
    logger.info('Thresholds already exist, skipping seed');
    return;
  }

  const now = new Date().toISOString();
  
  // Global thresholds (server_id = NULL)
  const thresholds = [
    // CPU thresholds
    { metric_type: 'cpu', threshold_value: 70, severity: 'warning' },
    { metric_type: 'cpu', threshold_value: 90, severity: 'critical' },
    // Memory thresholds
    { metric_type: 'memory', threshold_value: 75, severity: 'warning' },
    { metric_type: 'memory', threshold_value: 95, severity: 'critical' },
    // Disk thresholds
    { metric_type: 'disk', threshold_value: 80, severity: 'warning' },
    { metric_type: 'disk', threshold_value: 95, severity: 'critical' },
  ];

  const stmt = db.prepare(`
    INSERT INTO alert_thresholds (id, server_id, metric_type, threshold_value, severity, enabled, created_at)
    VALUES (?, NULL, ?, ?, ?, 1, ?)
  `);

  for (const threshold of thresholds) {
    const id = uuidv4();
    stmt.run(id, threshold.metric_type, threshold.threshold_value, threshold.severity, now);
  }

  logger.info('Thresholds seeded successfully', { count: thresholds.length });
}

/**
 * Run all seeds
 */
export async function runSeeds(): Promise<void> {
  logger.info('Running database seeds...');
  
  try {
    await seedUsers();
    seedServers();
    seedThresholds();
    logger.info('All seeds completed successfully');
  } catch (error) {
    logger.error('Error running seeds', { error });
    throw error;
  }
}

export default runSeeds;
