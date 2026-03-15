/**
 * Server Repository
 * Data access layer for server operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { Server, CreateServerInput, UpdateServerInput, ServerStatus } from '../models/Server';
import { logger } from '../utils/logger';

export class ServerRepository {
  /**
   * Find server by ID
   */
  public findById(id: string): Server | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as Server | null;
  }

  /**
   * Find server by name
   */
  public findByName(name: string): Server | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM servers WHERE name = ?').get(name) as Server | null;
  }

  /**
   * Get all servers
   */
  public findAll(options?: {
    status?: ServerStatus;
    type?: string;
    environment?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Server[] {
    const db = getDatabase();
    
    let query = 'SELECT * FROM servers WHERE 1=1';
    const params: (string | number)[] = [];

    if (options?.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }

    if (options?.environment) {
      query += ' AND environment = ?';
      params.push(options.environment);
    }

    if (options?.search) {
      query += ' AND (name LIKE ? OR ip_address LIKE ?)';
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY name ASC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    return db.prepare(query).all(...params) as Server[];
  }

  /**
   * Get servers count
   */
  public count(options?: {
    status?: ServerStatus;
    type?: string;
    environment?: string;
  }): number {
    const db = getDatabase();
    
    let query = 'SELECT COUNT(*) as count FROM servers WHERE 1=1';
    const params: string[] = [];

    if (options?.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }

    if (options?.environment) {
      query += ' AND environment = ?';
      params.push(options.environment);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    return result.count;
  }

  /**
   * Create new server
   */
  public create(input: CreateServerInput): Server {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO servers (id, name, ip_address, type, environment, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'unknown', ?, ?)
    `).run(
      id,
      input.name,
      input.ip_address || null,
      input.type || null,
      input.environment || null,
      now,
      now
    );

    logger.info('Server created', { serverId: id, name: input.name });
    return this.findById(id)!;
  }

  /**
   * Update server
   */
  public update(id: string, input: UpdateServerInput): Server | null {
    const db = getDatabase();
    const server = this.findById(id);
    if (!server) return null;

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.ip_address !== undefined) {
      updates.push('ip_address = ?');
      values.push(input.ip_address || null);
    }

    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type || null);
    }

    if (input.environment !== undefined) {
      updates.push('environment = ?');
      values.push(input.environment || null);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      db.prepare(`UPDATE servers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      logger.info('Server updated', { serverId: id });
    }

    return this.findById(id);
  }

  /**
   * Update server status
   */
  public updateStatus(id: string, status: ServerStatus): boolean {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE servers SET status = ?, updated_at = ? WHERE id = ?
    `).run(status, new Date().toISOString(), id);
    return result.changes > 0;
  }

  /**
   * Delete server
   */
  public delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM servers WHERE id = ?').run(id);
    logger.info('Server deleted', { serverId: id });
    return result.changes > 0;
  }

  /**
   * Get servers by status
   */
  public findByStatus(status: ServerStatus): Server[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM servers WHERE status = ?').all(status) as Server[];
  }

  /**
   * Get server statistics
   */
  public getStatistics(): {
    total: number;
    online: number;
    offline: number;
    degraded: number;
    unknown: number;
  } {
    const db = getDatabase();
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded,
        SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) as unknown
      FROM servers
    `).get() as {
      total: number;
      online: number;
      offline: number;
      degraded: number;
      unknown: number;
    };
    return stats;
  }
}

export const serverRepository = new ServerRepository();
export default serverRepository;
