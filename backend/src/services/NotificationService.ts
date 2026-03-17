import { AlertResponseDTO } from '../dtos/AlertDTO';
import { MetricsResponseDTO, ServerMetricsDTO } from '../dtos/MetricsDTO';
import { WebSocketGateway } from '../websocket/WebSocketGateway';
import emailService from './EmailService';
import { logger } from '../utils/logger';

class NotificationService {
  private gateway: WebSocketGateway | null = null;
  private previousStatuses = new Map<string, ServerMetricsDTO['status']>();

  public setGateway(gateway: WebSocketGateway): void {
    this.gateway = gateway;
  }

  public emitAlertCreated(alert: AlertResponseDTO): void {
    this.gateway?.emitAlert({
      id: alert.id,
      serverId: alert.server_id,
      serverName: alert.server_name || alert.server_id,
      type: alert.severity,
      message: alert.message,
      timestamp: new Date(alert.created_at),
      acknowledged: alert.acknowledged,
    });

    if (alert.severity === 'critical') {
      void emailService.sendCriticalAlertNotification(alert).catch((error) => {
        logger.error('Failed to send critical alert email', {
          alertId: alert.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }
  }

  public emitAlertAcknowledged(alert: AlertResponseDTO): void {
    this.gateway?.emitAlertAcknowledged({
      alertId: alert.id,
      acknowledgedBy: alert.acknowledged_by || 'unknown',
      timestamp: new Date(alert.acknowledged_at || new Date().toISOString()),
    });
  }

  public emitAlertResolved(alert: AlertResponseDTO): void {
    this.gateway?.emitAlertResolved({
      alertId: alert.id,
      resolvedAt: new Date(alert.resolved_at || new Date().toISOString()),
    });
  }

  public emitMonitoringSnapshot(snapshot: MetricsResponseDTO): void {
    this.gateway?.emitDashboardUpdate({
      summary: snapshot.summary,
      timestamp: snapshot.timestamp,
    });

    snapshot.servers.forEach((server) => {
      this.gateway?.emitMetricUpdate({
        serverId: server.server_id,
        serverName: server.server_name,
        timestamp: new Date(server.last_update),
        metrics: {
          cpu: server.metrics.cpu,
          memory: server.metrics.memory,
          disk: server.metrics.disk,
          networkIn: server.metrics.network_in,
          networkOut: server.metrics.network_out,
        },
      });

      const previousStatus = this.previousStatuses.get(server.server_id);
      if (previousStatus && previousStatus !== server.status) {
        this.gateway?.emitServerStatusChange({
          serverId: server.server_id,
          serverName: server.server_name,
          previousStatus,
          currentStatus: server.status,
          timestamp: new Date(server.last_update),
        });
      }

      this.previousStatuses.set(server.server_id, server.status);
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;