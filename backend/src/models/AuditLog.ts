/**
 * Audit Log Model
 * Entity representing audit trail entries
 */

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  details: string | null;
  ip_address: string | null;
  timestamp: string;
}

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'SERVER_CREATED'
  | 'SERVER_UPDATED'
  | 'SERVER_DELETED'
  | 'ALERT_ACKNOWLEDGED'
  | 'ALERT_RESOLVED'
  | 'THRESHOLD_CREATED'
  | 'THRESHOLD_UPDATED'
  | 'THRESHOLD_DELETED'
  | 'REPORT_GENERATED'
  | 'REPORT_DOWNLOADED'
  | 'PASSWORD_CHANGED'
  | 'SETTINGS_UPDATED';

export interface AuditLogWithUser extends AuditLog {
  username: string | null;
}

// Type for creating a new audit log entry
export interface CreateAuditLogInput {
  user_id?: string;
  action: AuditAction;
  details?: Record<string, unknown>;
  ip_address?: string;
}

// Query options for audit logs
export interface AuditLogQueryOptions {
  user_id?: string;
  action?: AuditAction;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export default AuditLog;
