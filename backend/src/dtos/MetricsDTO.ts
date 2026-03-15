/**
 * Metrics DTOs
 * Data Transfer Objects for metrics operations
 */

// Current metrics response
export interface MetricsResponseDTO {
  timestamp: string;
  servers: ServerMetricsDTO[];
  summary: MetricsSummaryDTO;
}

// Server metrics
export interface ServerMetricsDTO {
  server_id: string;
  server_name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network_in: number;
    network_out: number;
    uptime: number;
  };
  last_update: string;
}

// Metrics summary
export interface MetricsSummaryDTO {
  total_servers: number;
  servers_online: number;
  servers_offline: number;
  servers_degraded: number;
  avg_cpu: number;
  avg_memory: number;
  avg_disk: number;
  active_alerts: number;
}

// Historical metrics request
export interface MetricsHistoryQueryDTO {
  server_id?: string;
  metric_type?: 'cpu' | 'memory' | 'disk' | 'network';
  from_date: string;
  to_date: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '1d';
}

// Historical metrics response
export interface MetricsHistoryResponseDTO {
  server_id: string;
  metric_type: string;
  data: MetricsDataPoint[];
}

export interface MetricsDataPoint {
  timestamp: string;
  value: number;
}

// Prometheus query result
export interface PrometheusMetricDTO {
  metric: Record<string, string>;
  value: [number, string];
}

export interface PrometheusRangeDTO {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}
