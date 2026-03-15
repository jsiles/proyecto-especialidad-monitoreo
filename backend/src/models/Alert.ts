/**
 * Alert Model
 * Entity representing system alerts
 */

import { AlertThreshold } from './AlertThreshold';

export interface Alert {
  id: string;
  server_id: string;
  threshold_id: string | null;
  message: string;
  severity: AlertSeverity;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertWithDetails extends Alert {
  server_name: string;
  threshold?: AlertThreshold;
}

// Type for creating a new alert
export interface CreateAlertInput {
  server_id: string;
  threshold_id?: string;
  message: string;
  severity?: AlertSeverity;
}

// Type for acknowledging an alert
export interface AcknowledgeAlertInput {
  acknowledged_by: string;
}

export default Alert;
