/**
 * Monitoring Service
 * Business logic for metrics and monitoring operations
 */

import axios from 'axios';
import { serverRepository } from '../repositories/ServerRepository';
import { alertService } from './AlertService';
import { thresholdRepository } from '../repositories/ThresholdRepository';
import { alertRepository } from '../repositories/AlertRepository';
import { metricsCacheRepository } from '../repositories/MetricsCacheRepository';
import { 
  MetricsResponseDTO, 
  ServerMetricsDTO, 
  MetricsSummaryDTO,
  MetricsHistoryQueryDTO,
  MetricsHistoryResponseDTO,
  PrometheusMetricDTO,
} from '../dtos/MetricsDTO';
import { ServerStatus } from '../models/Server';
import { logger } from '../utils/logger';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

export class MonitoringService {
  /**
   * Get current metrics for all servers
   */
  public async getCurrentMetrics(): Promise<MetricsResponseDTO> {
    const servers = serverRepository.findAll();
    const serverMetrics: ServerMetricsDTO[] = [];

    for (const server of servers) {
      let metricsSnapshot: ServerMetricsDTO;

      try {
        metricsSnapshot = await this.getServerMetrics(server.id, server.name, false);
      } catch (error) {
        logger.warn('Failed to fetch metrics for server', { serverId: server.id, error });
        metricsSnapshot = {
          server_id: server.id,
          server_name: server.name,
          status: 'offline',
          metrics: { cpu: 0, memory: 0, disk: 0, network_in: 0, network_out: 0, uptime: 0 },
          last_update: new Date().toISOString(),
        };
      }

      this.persistMetricsSnapshot(metricsSnapshot);
      serverMetrics.push(metricsSnapshot);
    }

    const summary = this.calculateSummary(serverMetrics);

    return {
      timestamp: new Date().toISOString(),
      servers: serverMetrics,
      summary,
    };
  }

  /**
   * Get metrics for a specific server
   */
  public async getServerMetrics(
    serverId: string,
    serverName?: string,
    persistSnapshot = true
  ): Promise<ServerMetricsDTO> {
    const server = serverRepository.findById(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const name = serverName || server.name;

    try {
      let metricsSnapshot: ServerMetricsDTO;

      if (server.type === 'spi' || server.type === 'atc') {
        metricsSnapshot = await this.getNationalSystemMetrics(serverId, name, server.type, server.status);
      } else {
        // Query Prometheus for server metrics
        const [cpuResult, memoryResult, diskResult, uptimeResult] = await Promise.all([
          this.queryPrometheus(`cpu_usage_percent{server="${name}"}`),
          this.queryPrometheus(`memory_usage_percent{server="${name}"}`),
          this.queryPrometheus(`disk_usage_percent{server="${name}",mount="/"}`),
          this.queryPrometheus(`server_uptime_seconds{server="${name}"}`),
        ]);

        const cpu = this.extractValue(cpuResult);
        const memory = this.extractValue(memoryResult);
        const disk = this.extractValue(diskResult);
        const uptime = this.extractValue(uptimeResult);
        const hasMetricsSignal =
          cpuResult.length > 0 ||
          memoryResult.length > 0 ||
          diskResult.length > 0 ||
          uptimeResult.length > 0;

        // Determine status based on whether Prometheus still has signal for this server
        const status = this.determineStatus(hasMetricsSignal, cpu, memory, disk);

        // Update server status in database
        if (server.status !== status) {
          serverRepository.updateStatus(serverId, status);
        }

        this.syncStatusAlerts(serverId, name, status);

        // Check thresholds and create alerts if needed
        await this.checkThresholds(serverId, name, { cpu, memory, disk });

        metricsSnapshot = {
          server_id: serverId,
          server_name: name,
          status,
          metrics: {
            cpu,
            memory,
            disk,
            network_in: 0, // TODO: Add network metrics
            network_out: 0,
            uptime,
          },
          last_update: new Date().toISOString(),
        };
      }

      if (persistSnapshot) {
        this.persistMetricsSnapshot(metricsSnapshot);
      }

      return metricsSnapshot;
    } catch (error) {
      logger.error('Error fetching server metrics', { serverId, error });
      
      // Mark server as offline if we can't get metrics
      serverRepository.updateStatus(serverId, 'unknown');

      const fallbackSnapshot: ServerMetricsDTO = {
        server_id: serverId,
        server_name: name,
        status: 'unknown',
        metrics: { cpu: 0, memory: 0, disk: 0, network_in: 0, network_out: 0, uptime: 0 },
        last_update: new Date().toISOString(),
      };

      if (persistSnapshot) {
        this.persistMetricsSnapshot(fallbackSnapshot);
      }

      return fallbackSnapshot;
    }
  }

  private async getNationalSystemMetrics(
    serverId: string,
    serverName: string,
    serverType: 'spi' | 'atc',
    currentStatus: ServerStatus
  ): Promise<ServerMetricsDTO> {
    const isSPI = serverType === 'spi';
    const [serviceUpResult, primaryMetricResult, secondaryMetricResult] = await Promise.all([
      this.queryPrometheus(isSPI ? 'spi_service_up' : 'atc_service_up'),
      this.queryPrometheus(
        isSPI ? 'sum(rate(spi_transactions_total[5m]))' : 'sum(rate(atc_transactions_total[5m]))'
      ),
      this.queryPrometheus(
        isSPI
          ? 'sum(rate(spi_transactions_failed_total[5m]))'
          : 'atc_authorization_rate'
      ),
    ]);

    const serviceUp = this.extractValue(serviceUpResult);
    const primaryMetric = this.extractValue(primaryMetricResult);
    const secondaryMetric = this.extractValue(secondaryMetricResult);
    const status: ServerStatus = serviceUp >= 1 ? 'online' : 'offline';

    if (currentStatus !== status) {
      serverRepository.updateStatus(serverId, status);
    }

    this.syncStatusAlerts(serverId, serverName, status);

    return {
      server_id: serverId,
      server_name: serverName,
      status,
      metrics: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network_in: primaryMetric,
        network_out: secondaryMetric,
        uptime: serviceUp >= 1 ? 1 : 0,
      },
      last_update: new Date().toISOString(),
    };
  }

  /**
   * Get historical metrics
   */
  public async getMetricsHistory(query: MetricsHistoryQueryDTO): Promise<MetricsHistoryResponseDTO[]> {
    const results: MetricsHistoryResponseDTO[] = [];
    const servers = query.server_id 
      ? [serverRepository.findById(query.server_id)].filter(Boolean)
      : serverRepository.findAll();

    const metricTypes = query.metric_type 
      ? [query.metric_type]
      : ['cpu', 'memory', 'disk'];

    const step = this.intervalToSeconds(query.interval || '5m');

    for (const server of servers) {
      if (!server) continue;

      for (const metricType of metricTypes) {
        try {
          const promQuery = `${metricType}_usage_percent{server="${server.name}"}`;
          const data = await this.queryPrometheusRange(
            promQuery,
            query.from_date,
            query.to_date,
            step
          );

          results.push({
            server_id: server.id,
            metric_type: metricType,
            data: data.map(point => ({
              timestamp: new Date(point[0] * 1000).toISOString(),
              value: parseFloat(point[1]),
            })),
          });
        } catch (error) {
          logger.warn('Failed to fetch history for metric', { 
            serverId: server.id, 
            metricType, 
            error 
          });
        }
      }
    }

    return results;
  }

  /**
   * Query Prometheus for instant metric
   */
  private async queryPrometheus(query: string): Promise<PrometheusMetricDTO[]> {
    try {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000,
      });

      if (response.data.status === 'success') {
        return response.data.data.result;
      }
      return [];
    } catch (error) {
      logger.error('Prometheus query failed', { query, error });
      return [];
    }
  }

  /**
   * Query Prometheus for range data
   */
  private async queryPrometheusRange(
    query: string,
    start: string,
    end: string,
    step: number
  ): Promise<[number, string][]> {
    try {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
        params: {
          query,
          start: new Date(start).getTime() / 1000,
          end: new Date(end).getTime() / 1000,
          step: `${step}s`,
        },
        timeout: 10000,
      });

      if (response.data.status === 'success' && response.data.data.result.length > 0) {
        return response.data.data.result[0].values;
      }
      return [];
    } catch (error) {
      logger.error('Prometheus range query failed', { query, error });
      return [];
    }
  }

  /**
   * Extract numeric value from Prometheus result
   */
  private extractValue(result: PrometheusMetricDTO[]): number {
    if (result.length > 0 && result[0].value) {
      return parseFloat(result[0].value[1]) || 0;
    }
    return 0;
  }

  /**
   * Determine server status based on per-server metric signal and values
   */
  private determineStatus(
    hasMetricsSignal: boolean,
    cpu: number,
    memory: number,
    disk: number
  ): ServerStatus {
    if (!hasMetricsSignal) {
      return 'offline';
    }
    if (cpu > 95 || memory > 95 || disk > 95) {
      return 'degraded';
    }
    return 'online';
  }

  /**
   * Check thresholds and create alerts
   */
  private async checkThresholds(
    serverId: string,
    _serverName: string,
    metrics: { cpu: number; memory: number; disk: number }
  ): Promise<void> {
    const thresholds = thresholdRepository.findByServer(serverId);

    for (const threshold of thresholds) {
      const metricValue = metrics[threshold.metric_type as keyof typeof metrics];
      if (metricValue === undefined) continue;

      if (metricValue >= threshold.threshold_value) {
        // Check if there's already an active alert for this
        const existingAlerts = alertRepository.findAll({
          server_id: serverId,
          resolved: false,
          limit: 100,
        });

        const hasRecentAlert = existingAlerts.some(
          (alert) =>
            (alert.threshold_id === threshold.id ||
              alert.message.toLowerCase().includes(threshold.metric_type.toLowerCase())) &&
            alert.severity === threshold.severity
        );

        if (!hasRecentAlert) {
          alertService.createAlert({
            server_id: serverId,
            threshold_id: threshold.id,
            message: `${threshold.metric_type.toUpperCase()} usage at ${metricValue.toFixed(1)}% exceeds ${threshold.severity} threshold of ${threshold.threshold_value}%`,
            severity: threshold.severity === 'critical' ? 'critical' : 'warning',
          });
        }
      }
    }
  }

  private syncStatusAlerts(serverId: string, serverName: string, status: ServerStatus): void {
    const activeAlerts = alertRepository.findAll({
      server_id: serverId,
      resolved: false,
      limit: 100,
    });

    const offlineMessage = `Server ${serverName} is offline`;
    const degradedMessage = `Server ${serverName} is degraded`;

    const offlineAlert = activeAlerts.find(
      (alert) => alert.threshold_id === null && alert.message === offlineMessage
    );
    const degradedAlert = activeAlerts.find(
      (alert) => alert.threshold_id === null && alert.message === degradedMessage
    );

    if (status === 'online') {
      if (offlineAlert) {
        alertService.resolveAlert(offlineAlert.id);
      }

      if (degradedAlert) {
        alertService.resolveAlert(degradedAlert.id);
      }

      return;
    }

    if (status === 'offline') {
      if (degradedAlert) {
        alertService.resolveAlert(degradedAlert.id);
      }

      if (!offlineAlert) {
        alertService.createAlert({
          server_id: serverId,
          message: offlineMessage,
          severity: 'critical',
        });
      }

      return;
    }

    if (status === 'degraded') {
      if (offlineAlert) {
        alertService.resolveAlert(offlineAlert.id);
      }

      if (!degradedAlert) {
        alertService.createAlert({
          server_id: serverId,
          message: degradedMessage,
          severity: 'warning',
        });
      }
    }
  }

  private persistMetricsSnapshot(snapshot: ServerMetricsDTO): void {
    metricsCacheRepository.createSnapshot({
      server_id: snapshot.server_id,
      timestamp: snapshot.last_update,
      metrics: {
        cpu: snapshot.metrics.cpu,
        memory: snapshot.metrics.memory,
        disk: snapshot.metrics.disk,
        network_in: snapshot.metrics.network_in,
        network_out: snapshot.metrics.network_out,
        uptime: snapshot.metrics.uptime,
      },
    });
  }

  /**
   * Calculate metrics summary
   */
  private calculateSummary(serverMetrics: ServerMetricsDTO[]): MetricsSummaryDTO {
    const stats = serverRepository.getStatistics();
    const activeAlerts = alertRepository.countActive();

    let totalCpu = 0, totalMemory = 0, totalDisk = 0;
    let onlineCount = 0;

    for (const sm of serverMetrics) {
      const server = serverRepository.findById(sm.server_id);
      const isResourceServer = server?.type !== 'spi' && server?.type !== 'atc';

      if (isResourceServer && (sm.status === 'online' || sm.status === 'degraded')) {
        totalCpu += sm.metrics.cpu;
        totalMemory += sm.metrics.memory;
        totalDisk += sm.metrics.disk;
        onlineCount++;
      }
    }

    return {
      total_servers: stats.total,
      servers_online: stats.online,
      servers_offline: stats.offline,
      servers_degraded: stats.degraded,
      avg_cpu: onlineCount > 0 ? Math.round(totalCpu / onlineCount) : 0,
      avg_memory: onlineCount > 0 ? Math.round(totalMemory / onlineCount) : 0,
      avg_disk: onlineCount > 0 ? Math.round(totalDisk / onlineCount) : 0,
      active_alerts: activeAlerts,
    };
  }

  /**
   * Convert interval string to seconds
   */
  private intervalToSeconds(interval: string): number {
    const match = interval.match(/^(\d+)([mhd])$/);
    if (!match) return 300; // Default 5 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 300;
    }
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;
