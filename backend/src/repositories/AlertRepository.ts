/**
 * Alert Repository
 * Data access layer for alert operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { Alert, AlertWithDetails, CreateAlertInput, AlertSeverity } from '../models/Alert';
import { logger } from '../utils/logger';

export class AlertRepository {
  /**
   * Find alert by ID
   */
  public findById(id: string): Alert | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as Alert | null;
  }

  /**
   * Find alert by ID with server details
   */
  public findByIdWithDetails(id: string): AlertWithDetails | null {
    const db = getDatabase();
    const result = db.prepare(`
      SELECT 
        a.*,
        s.name as server_name
      FROM alerts a
      LEFT JOIN servers s ON a.server_id = s.id
      WHERE a.id = ?
    `).get(id) as (Alert & { server_name: string }) | null;

    if (!result) return null;

    return {
      ...result,
      acknowledged: Boolean(result.acknowledged),
      resolved: Boolean(result.resolved),
    };
  }

  /**
   * Get all alerts with filters
   */
  public findAll(options?: {
    server_id?: string;
    severity?: AlertSeverity;
    acknowledged?: boolean;
    resolved?: boolean;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): AlertWithDetails[] {
    const db = getDatabase();

    let query = `
      SELECT 
        a.*,
        s.name as server_name
      FROM alerts a
      LEFT JOIN servers s ON a.server_id = s.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (options?.server_id) {
      query += ' AND a.server_id = ?';
      params.push(options.server_id);
    }

    if (options?.severity) {
      query += ' AND a.severity = ?';
      params.push(options.severity);
    }

    if (options?.acknowledged !== undefined) {
      query += ' AND a.acknowledged = ?';
      params.push(options.acknowledged ? 1 : 0);
    }

    if (options?.resolved !== undefined) {
      query += ' AND a.resolved = ?';
      params.push(options.resolved ? 1 : 0);
    }

    if (options?.from_date) {
      query += ' AND a.created_at >= ?';
      params.push(options.from_date);
    }

    if (options?.to_date) {
      query += ' AND a.created_at <= ?';
      params.push(options.to_date);
    }

    query += ' ORDER BY a.created_at DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const results = db.prepare(query).all(...params) as (Alert & { server_name: string })[];
    
    return results.map(r => ({
      ...r,
      acknowledged: Boolean(r.acknowledged),
      resolved: Boolean(r.resolved),
    }));
  }

  /**
   * Get active (unresolved) alerts
   */
  public findActive(options?: {
    severity?: AlertSeverity;
    limit?: number;
  }): AlertWithDetails[] {
    return this.findAll({
      resolved: false,
      severity: options?.severity,
      limit: options?.limit,
    });
  }

  /**
   * Count active alerts
   */
  public countActive(severity?: AlertSeverity): number {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM alerts WHERE resolved = 0';
    const params: string[] = [];

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    return result.count;
  }

  /**
   * Create new alert
   */
  public create(input: CreateAlertInput): Alert {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO alerts (id, server_id, threshold_id, message, severity, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.server_id,
      input.threshold_id || null,
      input.message,
      input.severity || 'warning',
      now
    );

    logger.info('Alert created', { alertId: id, serverId: input.server_id, severity: input.severity });
    return this.findById(id)!;
  }

  /**
   * Acknowledge alert
   */
  public acknowledge(id: string, acknowledgedBy: string): Alert | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE alerts 
      SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
      WHERE id = ? AND acknowledged = 0
    `).run(acknowledgedBy, now, id);

    if (result.changes === 0) return null;

    logger.info('Alert acknowledged', { alertId: id, acknowledgedBy });
    return this.findById(id);
  }

  /**
   * Resolve alert
   */
  public resolve(id: string): Alert | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE alerts 
      SET resolved = 1, resolved_at = ?
      WHERE id = ? AND resolved = 0
    `).run(now, id);

    if (result.changes === 0) return null;

    logger.info('Alert resolved', { alertId: id });
    return this.findById(id);
  }

  /**
   * Delete alert
   */
  public delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Get alerts by server
   */
  public findByServer(serverId: string, limit = 50): AlertWithDetails[] {
    return this.findAll({ server_id: serverId, limit });
  }

  /**
   * Get alert statistics
   */
  public getStatistics(fromDate?: string, toDate?: string): {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    by_severity: { severity: string; count: number }[];
  } {
    const db = getDatabase();
    
    let dateFilter = '';
    const params: string[] = [];
    
    if (fromDate) {
      dateFilter += ' AND created_at >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      dateFilter += ' AND created_at <= ?';
      params.push(toDate);
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN acknowledged = 1 THEN 1 ELSE 0 END) as acknowledged,
        SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved
      FROM alerts WHERE 1=1 ${dateFilter}
    `).get(...params) as {
      total: number;
      active: number;
      acknowledged: number;
      resolved: number;
    };

    const bySeverity = db.prepare(`
      SELECT severity, COUNT(*) as count 
      FROM alerts WHERE 1=1 ${dateFilter}
      GROUP BY severity
    `).all(...params) as { severity: string; count: number }[];

    return {
      ...stats,
      by_severity: bySeverity,
    };
  }
}

export const alertRepository = new AlertRepository();
export default alertRepository;
