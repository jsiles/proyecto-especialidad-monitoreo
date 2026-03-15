/**
 * Audit Log Repository
 * Data access layer for audit log operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { AuditLog, AuditLogWithUser, CreateAuditLogInput, AuditLogQueryOptions } from '../models/AuditLog';
import { logger } from '../utils/logger';

export class AuditLogRepository {
  /**
   * Find audit log by ID
   */
  public findById(id: string): AuditLog | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as AuditLog | null;
  }

  /**
   * Get audit logs with filters
   */
  public findAll(options?: AuditLogQueryOptions): AuditLogWithUser[] {
    const db = getDatabase();

    let query = `
      SELECT 
        al.*,
        u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (options?.user_id) {
      query += ' AND al.user_id = ?';
      params.push(options.user_id);
    }

    if (options?.action) {
      query += ' AND al.action = ?';
      params.push(options.action);
    }

    if (options?.from_date) {
      query += ' AND al.timestamp >= ?';
      params.push(options.from_date);
    }

    if (options?.to_date) {
      query += ' AND al.timestamp <= ?';
      params.push(options.to_date);
    }

    query += ' ORDER BY al.timestamp DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    return db.prepare(query).all(...params) as AuditLogWithUser[];
  }

  /**
   * Create new audit log entry
   */
  public create(input: CreateAuditLogInput): AuditLog {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const details = input.details ? JSON.stringify(input.details) : null;

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.user_id || null,
      input.action,
      details,
      input.ip_address || null,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Get recent activity for a user
   */
  public getRecentActivity(userId: string, limit = 10): AuditLog[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM audit_logs 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(userId, limit) as AuditLog[];
  }

  /**
   * Get activity count by action type
   */
  public getActivityStats(fromDate?: string, toDate?: string): { action: string; count: number }[] {
    const db = getDatabase();
    
    let query = 'SELECT action, COUNT(*) as count FROM audit_logs WHERE 1=1';
    const params: string[] = [];
    
    if (fromDate) {
      query += ' AND timestamp >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      query += ' AND timestamp <= ?';
      params.push(toDate);
    }
    
    query += ' GROUP BY action ORDER BY count DESC';
    
    return db.prepare(query).all(...params) as { action: string; count: number }[];
  }

  /**
   * Clean old audit logs (older than specified days)
   */
  public cleanOldLogs(daysToKeep = 90): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = db.prepare('DELETE FROM audit_logs WHERE timestamp < ?').run(cutoffDate.toISOString());
    
    if (result.changes > 0) {
      logger.info('Cleaned old audit logs', { deletedCount: result.changes, daysToKeep });
    }
    
    return result.changes;
  }
}

export const auditLogRepository = new AuditLogRepository();
export default auditLogRepository;
