/**
 * Metrics cache model
 * Snapshot values persisted from Prometheus reads
 */

export type MetricsCacheMetricType =
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'network_in'
  | 'network_out'
  | 'uptime';

export interface MetricsCacheEntry {
  id: string;
  server_id: string;
  metric_type: MetricsCacheMetricType;
  value: number;
  timestamp: string;
}

export interface CreateMetricsSnapshotInput {
  server_id: string;
  timestamp: string;
  metrics: Record<MetricsCacheMetricType, number>;
}

