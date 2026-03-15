/**
 * User Repository
 * Data access layer for user operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { User, UserWithRoles, Role, CreateUserInput, UpdateUserInput, SafeUser } from '../models/User';
import { logger } from '../utils/logger';

export class UserRepository {
  /**
   * Find user by ID
   */
  public findById(id: string): User | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | null;
  }

  /**
   * Find user by username
   */
  public findByUsername(username: string): User | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | null;
  }

  /**
   * Find user by email
   */
  public findByEmail(email: string): User | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | null;
  }

  /**
   * Find user with roles
   */
  public findByIdWithRoles(id: string): UserWithRoles | null {
    const db = getDatabase();
    const user = this.findById(id);
    if (!user) return null;

    const roles = db.prepare(`
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(id) as Role[];

    return { ...user, roles };
  }

  /**
   * Find user by username with roles
   */
  public findByUsernameWithRoles(username: string): UserWithRoles | null {
    const user = this.findByUsername(username);
    if (!user) return null;
    return this.findByIdWithRoles(user.id);
  }

  /**
   * Get all users
   */
  public findAll(limit = 100, offset = 0): User[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users LIMIT ? OFFSET ?').all(limit, offset) as User[];
  }

  /**
   * Create new user
   */
  public create(input: CreateUserInput & { password_hash: string }): User {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, email, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, input.username, input.password_hash, input.email || null, now);

    // Assign roles if provided
    if (input.roles && input.roles.length > 0) {
      const insertRole = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
      for (const roleId of input.roles) {
        insertRole.run(id, roleId);
      }
    }

    logger.info('User created', { userId: id, username: input.username });
    return this.findById(id)!;
  }

  /**
   * Update user
   */
  public update(id: string, input: UpdateUserInput & { password_hash?: string }): User | null {
    const db = getDatabase();
    const user = this.findById(id);
    if (!user) return null;

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.email !== undefined) {
      updates.push('email = ?');
      values.push(input.email || null);
    }

    if (input.password_hash) {
      updates.push('password_hash = ?');
      values.push(input.password_hash);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // Update roles if provided
    if (input.roles) {
      db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);
      const insertRole = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
      for (const roleId of input.roles) {
        insertRole.run(id, roleId);
      }
    }

    logger.info('User updated', { userId: id });
    return this.findById(id);
  }

  /**
   * Update last login timestamp
   */
  public updateLastLogin(id: string): void {
    const db = getDatabase();
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), id);
  }

  /**
   * Delete user
   */
  public delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logger.info('User deleted', { userId: id });
    return result.changes > 0;
  }

  /**
   * Get user roles
   */
  public getUserRoles(userId: string): string[] {
    const db = getDatabase();
    const roles = db.prepare(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId) as { name: string }[];
    return roles.map(r => r.name);
  }

  /**
   * Check if username exists
   */
  public usernameExists(username: string): boolean {
    const db = getDatabase();
    const result = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    return !!result;
  }

  /**
   * Convert user to safe user (without password)
   */
  public toSafeUser(user: User): SafeUser {
    const roles = this.getUserRoles(user.id);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      last_login: user.last_login,
      roles,
    };
  }
}

export const userRepository = new UserRepository();
export default userRepository;
