/**
 * Metrics Service
 * Servicios de métricas y monitoreo
 */

import api, { ApiResponse } from './api';

// ==================== TYPES ====================

export interface Metrics {
  server_id: string;
  server_name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  timestamp: string;
}

export interface MetricsSummary {
  total_servers: number;
  servers_online: number;
  servers_offline: number;
  servers_degraded: number;
  average_cpu: number;
  average_memory: number;
  average_disk: number;
  active_alerts: number;
}

export interface MetricsHistory {
  server_id: string;
  metric_type: string;
  data: Array<{
    timestamp: string;
    value: number;
  }>;
}

export interface QueryMetricsParams {
  from?: string;
  to?: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '1d';
}

export interface SPIMetrics {
  serviceUp: number;
  transactionsPerSecond: number;
  failedTransactionsPerSecond: number;
  p95Duration: number;
}

export interface ATCMetrics {
  serviceUp: number;
  transactionsPerSecond: number;
  authorizationRate: number;
}

export interface LinkserMetrics {
  serviceUp: number;
  transactionsPerSecond: number;
  authorizationRate: number;
  activeDebitCards: number;
  activeCreditCards: number;
}

// ==================== METRICS SERVICE ====================

export const metricsService = {
  /**
   * Obtener métricas actuales de todos los servidores
   */
  async getCurrent(): Promise<Metrics[]> {
    const response = await api.get<
      ApiResponse<{
        timestamp: string;
        servers: Array<{
          server_id: string;
          server_name: string;
          status: 'online' | 'offline' | 'degraded' | 'unknown';
          metrics: {
            cpu: number;
            memory: number;
            disk: number;
            network_in: number;
            network_out: number;
          };
          last_update: string;
        }>;
      }>
    >(
      '/metrics'
    );

    return (response.data.data.servers || []).map((server) => ({
      server_id: server.server_id,
      server_name: server.server_name,
      status: server.status,
      cpu: server.metrics.cpu,
      memory: server.metrics.memory,
      disk: server.metrics.disk,
      networkIn: server.metrics.network_in,
      networkOut: server.metrics.network_out,
      timestamp: server.last_update,
    }));
  },

  /**
   * Obtener resumen de métricas
   */
  async getSummary(): Promise<MetricsSummary> {
    const response = await api.get<
      ApiResponse<{
        total_servers: number;
        servers_online: number;
        servers_offline: number;
        servers_degraded: number;
        avg_cpu: number;
        avg_memory: number;
        avg_disk: number;
        active_alerts: number;
      }>
    >(
      '/metrics/summary'
    );

    const summary = response.data.data;

    return {
      total_servers: summary.total_servers,
      servers_online: summary.servers_online,
      servers_offline: summary.servers_offline,
      servers_degraded: summary.servers_degraded,
      average_cpu: summary.avg_cpu,
      average_memory: summary.avg_memory,
      average_disk: summary.avg_disk,
      active_alerts: summary.active_alerts,
    };
  },

  /**
   * Obtener histórico de métricas
   */
  async getHistory(params?: QueryMetricsParams): Promise<MetricsHistory[]> {
    const response = await api.get<ApiResponse<{ history: MetricsHistory[] }>>(
      '/metrics/history',
      { params }
    );
    return response.data.data.history || [];
  },

  /**
   * Obtener histórico de métricas de un servidor específico
   */
  async getServerHistory(
    serverId: string,
    params?: QueryMetricsParams
  ): Promise<MetricsHistory[]> {
    const response = await api.get<ApiResponse<{ serverId: string; history: MetricsHistory[] }>>(
      `/metrics/history/${serverId}`,
      { params }
    );
    return response.data.data.history || [];
  },

  /**
   * Obtener métricas en formato Prometheus
   */
  async getPrometheusMetrics(): Promise<unknown> {
    const response = await api.get<ApiResponse<unknown>>('/metrics/prometheus');
    return response.data;
  },

  async getSPIMetrics(): Promise<SPIMetrics> {
    const response = await api.get<ApiResponse<SPIMetrics>>('/metrics/spi');
    return response.data.data;
  },

  async getATCMetrics(): Promise<ATCMetrics> {
    const response = await api.get<ApiResponse<ATCMetrics>>('/metrics/atc');
    return response.data.data;
  },

  async getLinkserMetrics(): Promise<LinkserMetrics> {
    const response = await api.get<ApiResponse<LinkserMetrics>>('/metrics/linkser');
    return response.data.data;
  },
};

export default metricsService;
