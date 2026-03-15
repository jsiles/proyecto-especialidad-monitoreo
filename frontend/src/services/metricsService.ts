/**
 * Metrics Service
 * Servicios de métricas y monitoreo
 */

import api, { ApiResponse } from './api';

// ==================== TYPES ====================

export interface Metrics {
  server_id: string;
  server_name?: string;
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
  average_cpu: number;
  average_memory: number;
  average_disk: number;
}

export interface MetricsHistory {
  server_id: string;
  data: Metrics[];
}

export interface QueryMetricsParams {
  from?: string;
  to?: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '1d';
}

// ==================== METRICS SERVICE ====================

export const metricsService = {
  /**
   * Obtener métricas actuales de todos los servidores
   */
  async getCurrent(): Promise<Metrics[]> {
    const response = await api.get<ApiResponse<{ metrics: Metrics[] }>>(
      '/metrics'
    );
    return response.data.data.metrics || [];
  },

  /**
   * Obtener resumen de métricas
   */
  async getSummary(): Promise<MetricsSummary> {
    const response = await api.get<ApiResponse<MetricsSummary>>(
      '/metrics/summary'
    );
    return response.data.data;
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
  ): Promise<Metrics[]> {
    const response = await api.get<ApiResponse<{ metrics: Metrics[] }>>(
      `/metrics/history/${serverId}`,
      { params }
    );
    return response.data.data.metrics || [];
  },

  /**
   * Obtener métricas en formato Prometheus
   */
  async getPrometheusMetrics(): Promise<string> {
    const response = await api.get<string>('/metrics/prometheus', {
      headers: {
        'Accept': 'text/plain',
      },
    });
    return response.data;
  },
};

export default metricsService;
