/**
 * Threshold Repository
 * Data access layer for alert threshold operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { AlertThreshold, ThresholdWithServer, CreateThresholdInput, UpdateThresholdInput, MetricType } from '../models/AlertThreshold';
import { formatLaPazSqlTimestamp } from '../utils/dateTime';
import { logger } from '../utils/logger';

export class ThresholdRepository {
  /**
   * Find threshold by ID
   */
  public findById(id: string): AlertThreshold | null {
    const db = getDatabase();
    const result = db.prepare('SELECT * FROM alert_thresholds WHERE id = ?').get(id) as AlertThreshold | null;
    if (result) {
      result.enabled = Boolean(result.enabled);
    }
    return result;
  }

  /**
   * Find threshold by ID with server details
   */
  public findByIdWithServer(id: string): ThresholdWithServer | null {
    const db = getDatabase();
    const result = db.prepare(`
      SELECT 
        t.*,
        s.name as server_name
      FROM alert_thresholds t
      LEFT JOIN servers s ON t.server_id = s.id
      WHERE t.id = ?
    `).get(id) as (AlertThreshold & { server_name: string | null }) | null;

    if (!result) return null;

    return {
      ...result,
      enabled: Boolean(result.enabled),
    };
  }

  /**
   * Get all thresholds
   */
  public findAll(options?: {
    server_id?: string;
    metric_type?: MetricType;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): ThresholdWithServer[] {
    const db = getDatabase();

    let query = `
      SELECT 
        t.*,
        s.name as server_name
      FROM alert_thresholds t
      LEFT JOIN servers s ON t.server_id = s.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (options?.server_id) {
      query += ' AND t.server_id = ?';
      params.push(options.server_id);
    }

    if (options?.metric_type) {
      query += ' AND t.metric_type = ?';
      params.push(options.metric_type);
    }

    if (options?.enabled !== undefined) {
      query += ' AND t.enabled = ?';
      params.push(options.enabled ? 1 : 0);
    }

    query += ' ORDER BY t.metric_type, t.severity';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const results = db.prepare(query).all(...params) as (AlertThreshold & { server_name: string | null })[];
    
    return results.map(r => ({
      ...r,
      enabled: Boolean(r.enabled),
    }));
  }

  /**
   * Get thresholds for a specific server (including global thresholds)
   */
  public findByServer(serverId: string): ThresholdWithServer[] {
    const db = getDatabase();
    const results = db.prepare(`
      SELECT 
        t.*,
        s.name as server_name
      FROM alert_thresholds t
      LEFT JOIN servers s ON t.server_id = s.id
      WHERE (t.server_id = ? OR t.server_id IS NULL) AND t.enabled = 1
      ORDER BY t.server_id DESC, t.metric_type, t.severity
    `).all(serverId) as (AlertThreshold & { server_name: string | null })[];

    return results.map(r => ({
      ...r,
      enabled: Boolean(r.enabled),
    }));
  }

  /**
   * Get global thresholds (not tied to specific server)
   */
  public findGlobal(): ThresholdWithServer[] {
    return this.findAll({ server_id: undefined }).filter(t => t.server_id === null);
  }

  /**
   * Create new threshold
   */
  public create(input: CreateThresholdInput): AlertThreshold {
    const db = getDatabase();
    const id = uuidv4();
    const now = formatLaPazSqlTimestamp(new Date());

    db.prepare(`
      INSERT INTO alert_thresholds (id, server_id, metric_type, threshold_value, severity, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.server_id || null,
      input.metric_type,
      input.threshold_value,
      input.severity || 'warning',
      input.enabled !== false ? 1 : 0,
      now
    );

    logger.info('Threshold created', { thresholdId: id, metricType: input.metric_type });
    return this.findById(id)!;
  }

  /**
   * Update threshold
   */
  public update(id: string, input: UpdateThresholdInput): AlertThreshold | null {
    const db = getDatabase();
    const threshold = this.findById(id);
    if (!threshold) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.threshold_value !== undefined) {
      updates.push('threshold_value = ?');
      values.push(input.threshold_value);
    }

    if (input.severity !== undefined) {
      updates.push('severity = ?');
      values.push(input.severity);
    }

    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(input.enabled ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE alert_thresholds SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      logger.info('Threshold updated', { thresholdId: id });
    }

    return this.findById(id);
  }

  /**
   * Delete threshold
   */
  public delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM alert_thresholds WHERE id = ?').run(id);
    logger.info('Threshold deleted', { thresholdId: id });
    return result.changes > 0;
  }

  /**
   * Check if threshold exists for server and metric type
   */
  public exists(serverId: string | null, metricType: MetricType, severity: string): boolean {
    const db = getDatabase();
    let query = 'SELECT 1 FROM alert_thresholds WHERE metric_type = ? AND severity = ? AND enabled = 1';
    const params: (string | null)[] = [metricType, severity];

    if (serverId) {
      query += ' AND server_id = ?';
      params.push(serverId);
    } else {
      query += ' AND server_id IS NULL';
    }

    const result = db.prepare(query).get(...params);
    return !!result;
  }

  /**
   * Get default thresholds configuration
   */
  public getDefaultThresholds(): CreateThresholdInput[] {
    return [
      { metric_type: 'cpu', threshold_value: 80, severity: 'warning' },
      { metric_type: 'cpu', threshold_value: 90, severity: 'critical' },
      { metric_type: 'memory', threshold_value: 85, severity: 'warning' },
      { metric_type: 'memory', threshold_value: 95, severity: 'critical' },
      { metric_type: 'disk', threshold_value: 80, severity: 'warning' },
      { metric_type: 'disk', threshold_value: 95, severity: 'critical' },
    ];
  }
}

export const thresholdRepository = new ThresholdRepository();
export default thresholdRepository;
