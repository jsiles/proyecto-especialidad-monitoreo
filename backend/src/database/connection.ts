/**
 * Database Connection and Initialization
 * SQLite with better-sqlite3
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

let db: Database.Database | null = null;

/**
 * Get database instance
 */
export const getDatabase = (): Database.Database => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

/**
 * Initialize database connection
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    const dbPath = process.env.DATABASE_PATH || './data/monitoring.db';
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Created database directory: ${dbDir}`);
    }

    // Create database connection
    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' 
        ? (message) => logger.debug('SQL:', { query: message })
        : undefined,
    });

    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');

    logger.info(`Database connected: ${dbPath}`);

    // Run migrations
    await runMigrations();

  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
};

/**
 * Run database migrations
 */
const runMigrations = async (): Promise<void> => {
  if (!db) return;

  logger.info('Running database migrations...');

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initial migration - create all tables
  const migrations = [
    {
      name: '001_initial',
      sql: `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME
        );

        -- Roles table
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT
        );

        -- User roles junction table
        CREATE TABLE IF NOT EXISTS user_roles (
          user_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          PRIMARY KEY (user_id, role_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        );

        -- Servers table
        CREATE TABLE IF NOT EXISTS servers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          ip_address TEXT,
          type TEXT,
          environment TEXT,
          status TEXT DEFAULT 'unknown',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Alert thresholds table
        CREATE TABLE IF NOT EXISTS alert_thresholds (
          id TEXT PRIMARY KEY,
          server_id TEXT,
          metric_type TEXT NOT NULL,
          threshold_value REAL NOT NULL,
          severity TEXT DEFAULT 'warning',
          enabled INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
        );

        -- Alerts table
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          threshold_id TEXT,
          message TEXT,
          severity TEXT DEFAULT 'warning',
          acknowledged INTEGER DEFAULT 0,
          acknowledged_by TEXT,
          acknowledged_at DATETIME,
          resolved INTEGER DEFAULT 0,
          resolved_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (server_id) REFERENCES servers(id),
          FOREIGN KEY (threshold_id) REFERENCES alert_thresholds(id)
        );

        -- Reports table
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          period TEXT,
          file_path TEXT,
          generated_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (generated_by) REFERENCES users(id)
        );

        -- Audit logs table
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Metrics cache table (for storing Prometheus data snapshots)
        CREATE TABLE IF NOT EXISTS metrics_cache (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          metric_type TEXT NOT NULL,
          value REAL NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_alerts_server ON alerts(server_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
        CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
        CREATE INDEX IF NOT EXISTS idx_metrics_server ON metrics_cache(server_id);
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics_cache(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
      `,
    },
    {
      name: '002_seed_data',
      sql: `
        -- Insert default roles
        INSERT OR IGNORE INTO roles (id, name, description) VALUES
          ('role-admin', 'ADMIN', 'System administrator with full access'),
          ('role-operator', 'OPERATOR', 'Monitoring operator'),
          ('role-auditor', 'AUDITOR', 'Read-only access for auditing');
      `,
    },
  ];

  for (const migration of migrations) {
    const existing = db.prepare('SELECT * FROM migrations WHERE name = ?').get(migration.name);
    
    if (!existing) {
      logger.info(`Running migration: ${migration.name}`);
      db.exec(migration.sql);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
      logger.info(`Migration completed: ${migration.name}`);
    }
  }

  logger.info('All migrations completed');
};

/**
 * Close database connection
 */
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
};

export default { getDatabase, initializeDatabase, closeDatabase };
