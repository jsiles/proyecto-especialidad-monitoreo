/**
 * PrometheusService - Consulta de métricas desde Prometheus
 * Permite al backend obtener métricas en tiempo real
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface PrometheusQuery {
  query: string;
  time?: number;
  start?: number;
  end?: number;
  step?: string;
}

export interface PrometheusResult {
  metric: Record<string, string>;
  value?: [number, string];
  values?: Array<[number, string]>;
}

export interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusResult[];
  };
}

export interface MetricData {
  serverId: string;
  serverName: string;
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  status: 'online' | 'offline' | 'degraded';
}

export class PrometheusService {
  private client: AxiosInstance;
  private prometheusUrl: string;

  constructor() {
    this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
    this.client = axios.create({
      baseURL: this.prometheusUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    logger.info('PrometheusService initialized', { prometheusUrl: this.prometheusUrl });
  }

  /**
   * Ejecutar consulta instantánea
   */
  async query(promQuery: string, time?: number): Promise<PrometheusResponse> {
    try {
      const params: any = { query: promQuery };
      if (time) {
        params.time = time;
      }

      const response = await this.client.get('/api/v1/query', { params });

      if (response.data.status !== 'success') {
        throw new Error(`Prometheus query failed: ${response.data.error}`);
      }

      return response.data;
    } catch (error: any) {
      logger.error('Error executing Prometheus query', {
        query: promQuery,
        error: error.message,
      });
      throw new Error(`Failed to query Prometheus: ${error.message}`);
    }
  }

  /**
   * Ejecutar consulta de rango (histórico)
   */
  async queryRange(
    promQuery: string,
    start: number,
    end: number,
    step: string = '15s'
  ): Promise<PrometheusResponse> {
    try {
      const params = {
        query: promQuery,
        start,
        end,
        step,
      };

      const response = await this.client.get('/api/v1/query_range', { params });

      if (response.data.status !== 'success') {
        throw new Error(`Prometheus query_range failed: ${response.data.error}`);
      }

      return response.data;
    } catch (error: any) {
      logger.error('Error executing Prometheus range query', {
        query: promQuery,
        error: error.message,
      });
      throw new Error(`Failed to query Prometheus range: ${error.message}`);
    }
  }

  /**
   * Obtener métricas actuales de todos los servidores
   */
  async getCurrentMetrics(): Promise<MetricData[]> {
    try {
      const queries = {
        cpu: 'cpu_usage_percent',
        memory: 'memory_usage_percent',
        disk: 'disk_usage_percent',
        networkIn: 'rate(network_bytes_received_total[1m])',
        networkOut: 'rate(network_bytes_sent_total[1m])',
        up: 'up',
      };

      const results = await Promise.all([
        this.query(queries.cpu),
        this.query(queries.memory),
        this.query(queries.disk),
        this.query(queries.networkIn),
        this.query(queries.networkOut),
        this.query(queries.up),
      ]);

      // Agrupar métricas por servidor
      const metricsMap = new Map<string, Partial<MetricData>>();

      // CPU
      results[0].data.result.forEach((item) => {
        const serverId = item.metric.instance || item.metric.server || 'unknown';
        if (!metricsMap.has(serverId)) {
          metricsMap.set(serverId, { serverId, serverName: item.metric.server || serverId });
        }
        metricsMap.get(serverId)!.cpu = parseFloat(item.value?.[1] || '0');
      });

      // Memory
      results[1].data.result.forEach((item) => {
        const serverId = item.metric.instance || item.metric.server || 'unknown';
        if (!metricsMap.has(serverId)) {
          metricsMap.set(serverId, { serverId, serverName: item.metric.server || serverId });
        }
        metricsMap.get(serverId)!.memory = parseFloat(item.value?.[1] || '0');
      });

      // Disk
      results[2].data.result.forEach((item) => {
        const serverId = item.metric.instance || item.metric.server || 'unknown';
        if (!metricsMap.has(serverId)) {
          metricsMap.set(serverId, { serverId, serverName: item.metric.server || serverId });
        }
        metricsMap.get(serverId)!.disk = parseFloat(item.value?.[1] || '0');
      });

      // Network In
      results[3].data.result.forEach((item) => {
        const serverId = item.metric.instance || item.metric.server || 'unknown';
        if (!metricsMap.has(serverId)) {
          metricsMap.set(serverId, { serverId, serverName: item.metric.server || serverId });
        }
        metricsMap.get(serverId)!.networkIn = parseFloat(item.value?.[1] || '0');
      });

      // Network Out
      results[4].data.result.forEach((item) => {
        const serverId = item.metric.instance || item.metric.server || 'unknown';
        if (!metricsMap.has(serverId)) {
          metricsMap.set(serverId, { serverId, serverName: item.metric.server || serverId });
        }
        metricsMap.get(serverId)!.networkOut = parseFloat(item.value?.[1] || '0');
      });

      // Status (up)
      results[5].data.result.forEach((item) => {
        const serverId = item.metric.instance || item.metric.server || 'unknown';
        const upValue = parseFloat(item.value?.[1] || '0');
        if (!metricsMap.has(serverId)) {
          metricsMap.set(serverId, { serverId, serverName: item.metric.server || serverId });
        }
        metricsMap.get(serverId)!.status = upValue === 1 ? 'online' : 'offline';
      });

      // Convertir a array y agregar timestamp
      const metrics: MetricData[] = Array.from(metricsMap.values()).map((m) => ({
        serverId: m.serverId!,
        serverName: m.serverName!,
        timestamp: new Date(),
        cpu: m.cpu || 0,
        memory: m.memory || 0,
        disk: m.disk || 0,
        networkIn: m.networkIn || 0,
        networkOut: m.networkOut || 0,
        status: m.status || 'offline',
      }));

      return metrics;
    } catch (error: any) {
      logger.error('Error getting current metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener métricas históricas de un servidor
   */
  async getServerMetricsHistory(
    serverId: string,
    startTime: number,
    endTime: number,
    step: string = '1m'
  ): Promise<any> {
    try {
      const queries = {
        cpu: `cpu_usage_percent{instance="${serverId}"}`,
        memory: `memory_usage_percent{instance="${serverId}"}`,
        disk: `disk_usage_percent{instance="${serverId}"}`,
      };

      const [cpuData, memoryData, diskData] = await Promise.all([
        this.queryRange(queries.cpu, startTime, endTime, step),
        this.queryRange(queries.memory, startTime, endTime, step),
        this.queryRange(queries.disk, startTime, endTime, step),
      ]);

      return {
        serverId,
        cpu: cpuData.data.result[0]?.values || [],
        memory: memoryData.data.result[0]?.values || [],
        disk: diskData.data.result[0]?.values || [],
      };
    } catch (error: any) {
      logger.error('Error getting server metrics history', {
        serverId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Obtener métricas de SPI
   */
  async getSPIMetrics(): Promise<any> {
    try {
      const queries = {
        serviceUp: 'spi_service_up',
        transactionsTotal: 'rate(spi_transactions_total[5m])',
        transactionsFailed: 'rate(spi_transactions_failed_total[5m])',
        transactionDuration: 'histogram_quantile(0.95, rate(spi_transaction_duration_seconds_bucket[5m]))',
      };

      const [serviceUp, transactionsTotal, transactionsFailed, transactionDuration] =
        await Promise.all([
          this.query(queries.serviceUp),
          this.query(queries.transactionsTotal),
          this.query(queries.transactionsFailed),
          this.query(queries.transactionDuration),
        ]);

      return {
        serviceUp: parseFloat(serviceUp.data.result[0]?.value?.[1] || '0'),
        transactionsPerSecond: parseFloat(transactionsTotal.data.result[0]?.value?.[1] || '0'),
        failedTransactionsPerSecond: parseFloat(
          transactionsFailed.data.result[0]?.value?.[1] || '0'
        ),
        p95Duration: parseFloat(transactionDuration.data.result[0]?.value?.[1] || '0'),
      };
    } catch (error: any) {
      logger.error('Error getting SPI metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener métricas de ATC
   */
  async getATCMetrics(): Promise<any> {
    try {
      const queries = {
        serviceUp: 'atc_service_up',
        transactionsTotal: 'rate(atc_transactions_total[5m])',
        authorizationRate: 'atc_authorization_rate',
      };

      const [serviceUp, transactionsTotal, authorizationRate] = await Promise.all([
        this.query(queries.serviceUp),
        this.query(queries.transactionsTotal),
        this.query(queries.authorizationRate),
      ]);

      return {
        serviceUp: parseFloat(serviceUp.data.result[0]?.value?.[1] || '0'),
        transactionsPerSecond: parseFloat(transactionsTotal.data.result[0]?.value?.[1] || '0'),
        authorizationRate: parseFloat(authorizationRate.data.result[0]?.value?.[1] || '0'),
      };
    } catch (error: any) {
      logger.error('Error getting ATC metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Verificar conectividad con Prometheus
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/-/healthy');
      return response.status === 200;
    } catch (error: any) {
      logger.error('Prometheus health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Obtener todas las métricas disponibles
   */
  async getMetricNames(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/v1/label/__name__/values');
      return response.data.data || [];
    } catch (error: any) {
      logger.error('Error getting metric names', { error: error.message });
      throw error;
    }
  }
}

export default new PrometheusService();
