/**
 * Report Repository
 * Data access layer for reports
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { Report, ReportType, ReportStatus } from '../models/Report';
import { formatLaPazSqlTimestamp } from '../utils/dateTime';

export interface ReportQueryOptions {
  type?: ReportType;
  status?: ReportStatus;
  from_date?: string;
  to_date?: string;
  generated_by?: string;
  limit?: number;
  offset?: number;
}

export class ReportRepository {
  /**
   * Find all reports with optional filters
   */
  public findAll(options: ReportQueryOptions = {}): { reports: Report[]; total: number } {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options.type) {
      conditions.push('r.type = ?');
      params.push(options.type);
    }

    if (options.status) {
      conditions.push('r.status = ?');
      params.push(options.status);
    }

    if (options.generated_by) {
      conditions.push('r.generated_by = ?');
      params.push(options.generated_by);
    }

    if (options.from_date) {
      conditions.push('r.created_at >= ?');
      params.push(options.from_date);
    }

    if (options.to_date) {
      conditions.push('r.created_at <= ?');
      params.push(options.to_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM reports r ${whereClause}`);
    const { count: total } = countStmt.get(...params) as { count: number };

    // Get reports with pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const stmt = db.prepare(`
      SELECT r.*, u.username as generated_by_username
      FROM reports r
      LEFT JOIN users u ON r.generated_by = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const reports = stmt.all(...params, limit, offset) as Report[];

    return { reports, total };
  }

  /**
   * Find report by ID
   */
  public findById(id: string): Report | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT r.*, u.username as generated_by_username
      FROM reports r
      LEFT JOIN users u ON r.generated_by = u.id
      WHERE r.id = ?
    `);
    return (stmt.get(id) as Report) || null;
  }

  /**
   * Create a new report record
   */
  public create(data: {
    type: ReportType;
    period_start: string;
    period_end: string;
    generated_by?: string;
    status?: ReportStatus;
    file_path?: string;
    file_size?: number;
  }): Report {
    const db = getDatabase();
    const id = uuidv4();
    const now = formatLaPazSqlTimestamp(new Date());

    const stmt = db.prepare(`
      INSERT INTO reports (id, type, period_start, period_end, generated_by, status, file_path, file_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.type,
      data.period_start,
      data.period_end,
      data.generated_by || null,
      data.status || 'pending',
      data.file_path || null,
      data.file_size || null,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Update report status and file info
   */
  public update(
    id: string,
    data: {
      status?: ReportStatus;
      file_path?: string;
      file_size?: number;
      error_message?: string;
    }
  ): Report | null {
    const db = getDatabase();
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.file_path !== undefined) {
      updates.push('file_path = ?');
      params.push(data.file_path);
    }

    if (data.file_size !== undefined) {
      updates.push('file_size = ?');
      params.push(data.file_size);
    }

    if (data.error_message !== undefined) {
      updates.push('error_message = ?');
      params.push(data.error_message);
    }

    if (data.status === 'completed') {
      updates.push('completed_at = ?');
      params.push(formatLaPazSqlTimestamp(new Date()));
    }

    if (updates.length === 0) return this.findById(id);

    params.push(id);

    const stmt = db.prepare(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    return this.findById(id);
  }

  /**
   * Delete a report
   */
  public delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get reports statistics
   */
  public getStatistics(): {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    recent_count: number;
  } {
    const db = getDatabase();

    // Total count
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM reports');
    const { count: total } = totalStmt.get() as { count: number };

    // By type
    const byTypeStmt = db.prepare(`
      SELECT type, COUNT(*) as count FROM reports GROUP BY type
    `);
    const typeResults = byTypeStmt.all() as { type: string; count: number }[];
    const by_type: Record<string, number> = {};
    typeResults.forEach(r => {
      by_type[r.type] = r.count;
    });

    // By status
    const byStatusStmt = db.prepare(`
      SELECT status, COUNT(*) as count FROM reports GROUP BY status
    `);
    const statusResults = byStatusStmt.all() as { status: string; count: number }[];
    const by_status: Record<string, number> = {};
    statusResults.forEach(r => {
      by_status[r.status] = r.count;
    });

    // Recent (last 7 days)
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 7);
    const recentStmt = db.prepare(`
      SELECT COUNT(*) as count FROM reports 
      WHERE created_at >= ?
    `);
    const { count: recent_count } = recentStmt.get(
      formatLaPazSqlTimestamp(recentCutoff)
    ) as { count: number };

    return { total, by_type, by_status, recent_count };
  }
}

// Export singleton instance
export const reportRepository = new ReportRepository();
