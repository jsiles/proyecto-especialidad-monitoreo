/**
 * Alert Threshold Model
 * Entity representing alert configuration thresholds
 */

export interface AlertThreshold {
  id: string;
  server_id: string | null; // null = global threshold
  metric_type: MetricType;
  threshold_value: number;
  severity: ThresholdSeverity;
  enabled: boolean;
  created_at: string;
}

export type MetricType = 'cpu' | 'memory' | 'disk' | 'network_in' | 'network_out' | 'latency';

export type ThresholdSeverity = 'warning' | 'critical';

export interface ThresholdWithServer extends AlertThreshold {
  server_name: string | null;
}

// Type for creating a new threshold
export interface CreateThresholdInput {
  server_id?: string | null;
  metric_type: MetricType;
  threshold_value: number;
  severity?: ThresholdSeverity;
  enabled?: boolean;
}

// Type for updating a threshold
export interface UpdateThresholdInput {
  threshold_value?: number;
  severity?: ThresholdSeverity;
  enabled?: boolean;
}

export default AlertThreshold;
