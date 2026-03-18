/**
 * Alert DTOs
 * Data Transfer Objects for alert operations
 */

import { AlertSeverity } from '../models/Alert';
import { MetricType, ThresholdSeverity } from '../models/AlertThreshold';

// Create alert request
export interface CreateAlertDTO {
  server_id: string;
  threshold_id?: string;
  message: string;
  severity?: AlertSeverity;
}

// Acknowledge alert request
export interface AcknowledgeAlertDTO {
  acknowledged_by: string;
}

// Alert query params
export interface AlertQueryDTO {
  server_id?: string;
  severity?: AlertSeverity;
  acknowledged?: boolean;
  resolved?: boolean;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// Alert response
export interface AlertResponseDTO {
  id: string;
  server_id: string;
  server_name: string;
  threshold_id?: string | null;
  message: string;
  severity: AlertSeverity;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

// Create threshold request
export interface CreateThresholdDTO {
  server_id?: string | null;
  metric_type: MetricType;
  threshold_value: number;
  severity?: ThresholdSeverity;
  enabled?: boolean;
}

// Update threshold request
export interface UpdateThresholdDTO {
  threshold_value?: number;
  severity?: ThresholdSeverity;
  enabled?: boolean;
}

// Threshold response
export interface ThresholdResponseDTO {
  id: string;
  server_id: string | null;
  server_name: string | null;
  metric_type: MetricType;
  threshold_value: number;
  severity: ThresholdSeverity;
  enabled: boolean;
  created_at: string;
}

// Valid values for validation
const VALID_SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical'];
const VALID_THRESHOLD_SEVERITIES: ThresholdSeverity[] = ['warning', 'critical'];
const VALID_METRIC_TYPES: MetricType[] = ['cpu', 'memory', 'disk', 'network_in', 'network_out', 'latency'];

// Validation functions
export function validateCreateAlertDTO(data: unknown): CreateAlertDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { server_id, threshold_id, message, severity } = data as Record<string, unknown>;

  if (!server_id || typeof server_id !== 'string') {
    throw new Error('Server ID is required');
  }

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    throw new Error('Alert message must be at least 5 characters');
  }

  if (severity !== undefined && !VALID_SEVERITIES.includes(severity as AlertSeverity)) {
    throw new Error(`Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  return {
    server_id,
    threshold_id: threshold_id as string | undefined,
    message: message.trim(),
    severity: (severity as AlertSeverity) || 'warning',
  };
}

export function validateCreateThresholdDTO(data: unknown): CreateThresholdDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { server_id, metric_type, threshold_value, severity, enabled } = data as Record<string, unknown>;

  if (!metric_type || !VALID_METRIC_TYPES.includes(metric_type as MetricType)) {
    throw new Error(`Metric type is required. Must be one of: ${VALID_METRIC_TYPES.join(', ')}`);
  }

  if (threshold_value === undefined || typeof threshold_value !== 'number' || threshold_value < 0 || threshold_value > 100) {
    throw new Error('Threshold value must be a number between 0 and 100');
  }

  if (severity !== undefined && !VALID_THRESHOLD_SEVERITIES.includes(severity as ThresholdSeverity)) {
    throw new Error(`Invalid severity. Must be one of: ${VALID_THRESHOLD_SEVERITIES.join(', ')}`);
  }

  if (server_id !== undefined && server_id !== null && typeof server_id !== 'string') {
    throw new Error('Server ID must be a string when provided');
  }

  return {
    server_id: typeof server_id === 'string' && server_id.trim().length > 0 ? server_id.trim() : null,
    metric_type: metric_type as MetricType,
    threshold_value,
    severity: (severity as ThresholdSeverity) || 'warning',
    enabled: enabled !== false,
  };
}

export function validateUpdateThresholdDTO(data: unknown): UpdateThresholdDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { threshold_value, severity, enabled } = data as Record<string, unknown>;

  const result: UpdateThresholdDTO = {};

  if (threshold_value !== undefined) {
    if (typeof threshold_value !== 'number' || threshold_value < 0 || threshold_value > 100) {
      throw new Error('Threshold value must be a number between 0 and 100');
    }
    result.threshold_value = threshold_value;
  }

  if (severity !== undefined) {
    if (!VALID_THRESHOLD_SEVERITIES.includes(severity as ThresholdSeverity)) {
      throw new Error(`Invalid severity. Must be one of: ${VALID_THRESHOLD_SEVERITIES.join(', ')}`);
    }
    result.severity = severity as ThresholdSeverity;
  }

  if (enabled !== undefined) {
    result.enabled = Boolean(enabled);
  }

  return result;
}
