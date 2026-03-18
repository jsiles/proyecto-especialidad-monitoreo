/**
 * Alert Service
 * Business logic for alert management
 */

import { alertRepository } from '../repositories/AlertRepository';
import { thresholdRepository } from '../repositories/ThresholdRepository';
import { serverRepository } from '../repositories/ServerRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { 
  CreateAlertDTO, 
  AlertQueryDTO, 
  AlertResponseDTO,
  CreateThresholdDTO,
  UpdateThresholdDTO,
  ThresholdResponseDTO,
} from '../dtos/AlertDTO';
import { AlertWithDetails } from '../models/Alert';
import { ThresholdWithServer } from '../models/AlertThreshold';
import { logger } from '../utils/logger';
import { NotFoundError, BadRequestError } from '../middlewares/errorHandler';
import notificationService from './NotificationService';

export class AlertService {
  /**
   * Get all alerts with filters
   */
  public getAlerts(query?: AlertQueryDTO): { alerts: AlertResponseDTO[]; total: number } {
    const alerts = alertRepository.findAll({
      server_id: query?.server_id,
      severity: query?.severity,
      acknowledged: query?.acknowledged,
      resolved: query?.resolved,
      from_date: query?.from_date,
      to_date: query?.to_date,
      limit: query?.limit || 100,
      offset: query?.offset || 0,
    });

    const total = alertRepository.countAll({
      server_id: query?.server_id,
      severity: query?.severity,
      acknowledged: query?.acknowledged,
      resolved: query?.resolved,
      from_date: query?.from_date,
      to_date: query?.to_date,
    });

    return {
      alerts: alerts.map(this.toAlertResponseDTO),
      total,
    };
  }

  /**
   * Get active (unresolved) alerts
   */
  public getActiveAlerts(severity?: string): AlertResponseDTO[] {
    const alerts = alertRepository.findActive({
      severity: severity as AlertResponseDTO['severity'],
      limit: 100,
    });

    const seen = new Set<string>();

    return alerts
      .filter((alert) => {
        const key = alert.threshold_id
          ? `threshold:${alert.server_id}:${alert.threshold_id}:${alert.severity}`
          : `message:${alert.server_id}:${alert.severity}:${alert.message.toLowerCase()}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map(this.toAlertResponseDTO);
  }

  /**
   * Get alert by ID
   */
  public getAlertById(id: string): AlertResponseDTO {
    const alert = alertRepository.findByIdWithDetails(id);
    if (!alert) {
      throw new NotFoundError(`Alert with ID ${id} not found`);
    }
    return this.toAlertResponseDTO(alert);
  }

  /**
   * Create new alert
   */
  public createAlert(data: CreateAlertDTO): AlertResponseDTO {
    // Verify server exists
    const server = serverRepository.findById(data.server_id);
    if (!server) {
      throw new BadRequestError(`Server with ID ${data.server_id} not found`);
    }

    const alert = alertRepository.create(data);
    const alertWithDetails = alertRepository.findByIdWithDetails(alert.id)!;

    logger.info('Alert created', { 
      alertId: alert.id, 
      serverId: data.server_id, 
      severity: data.severity 
    });
    const response = this.toAlertResponseDTO(alertWithDetails);
    notificationService.emitAlertCreated(response);
    return response;
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(id: string, userId: string, username: string): AlertResponseDTO {
    const alert = alertRepository.findById(id);
    if (!alert) {
      throw new NotFoundError(`Alert with ID ${id} not found`);
    }

    if (alert.acknowledged) {
      throw new BadRequestError('Alert is already acknowledged');
    }

    const updated = alertRepository.acknowledge(id, username);

    // Log acknowledgment
    auditLogRepository.create({
      user_id: userId,
      action: 'ALERT_ACKNOWLEDGED',
      details: { alertId: id },
    });

    logger.info('Alert acknowledged', { alertId: id, acknowledgedBy: username });

    const alertWithDetails = alertRepository.findByIdWithDetails(updated!.id)!;
    const response = this.toAlertResponseDTO(alertWithDetails);
    notificationService.emitAlertAcknowledged(response);
    return response;
  }

  /**
   * Resolve alert
   */
  public resolveAlert(id: string, userId?: string): AlertResponseDTO {
    const alert = alertRepository.findById(id);
    if (!alert) {
      throw new NotFoundError(`Alert with ID ${id} not found`);
    }

    if (alert.resolved) {
      throw new BadRequestError('Alert is already resolved');
    }

    const relatedActiveAlerts = alertRepository.findAll({
      server_id: alert.server_id,
      resolved: false,
      limit: 100,
    });

    const relatedAlertsToResolve = relatedActiveAlerts.filter((candidate) => {
      if (candidate.id === id) {
        return true;
      }

      if (alert.threshold_id) {
        return candidate.threshold_id === alert.threshold_id;
      }

      return (
        candidate.threshold_id === null &&
        candidate.severity === alert.severity &&
        candidate.message === alert.message
      );
    });

    for (const relatedAlert of relatedAlertsToResolve) {
      alertRepository.resolve(relatedAlert.id);
    }

    // Log resolution
    if (userId) {
      auditLogRepository.create({
        user_id: userId,
        action: 'ALERT_RESOLVED',
        details: { alertId: id },
      });
    }

    logger.info('Alert resolved', { alertId: id });

    const alertWithDetails = alertRepository.findByIdWithDetails(id)!;
    const response = this.toAlertResponseDTO(alertWithDetails);
    relatedAlertsToResolve.forEach((relatedAlert) => {
      const resolvedAlert = alertRepository.findByIdWithDetails(relatedAlert.id);
      if (resolvedAlert) {
        notificationService.emitAlertResolved(this.toAlertResponseDTO(resolvedAlert));
      }
    });
    return response;
  }

  /**
   * Get alert statistics
   */
  public getAlertStatistics(fromDate?: string, toDate?: string) {
    return alertRepository.getStatistics(fromDate, toDate);
  }

  // ==================== THRESHOLD MANAGEMENT ====================

  /**
   * Get all thresholds
   */
  public getThresholds(serverId?: string): ThresholdResponseDTO[] {
    const thresholds = serverId 
      ? thresholdRepository.findByServer(serverId)
      : thresholdRepository.findAll({ enabled: true });
    return thresholds.map(this.toThresholdResponseDTO);
  }

  /**
   * Get threshold by ID
   */
  public getThresholdById(id: string): ThresholdResponseDTO {
    const threshold = thresholdRepository.findByIdWithServer(id);
    if (!threshold) {
      throw new NotFoundError(`Threshold with ID ${id} not found`);
    }
    return this.toThresholdResponseDTO(threshold);
  }

  /**
   * Create threshold
   */
  public createThreshold(data: CreateThresholdDTO, userId?: string): ThresholdResponseDTO {
    // Verify server exists if server_id provided
    if (data.server_id) {
      const server = serverRepository.findById(data.server_id);
      if (!server) {
        throw new BadRequestError(`Server with ID ${data.server_id} not found`);
      }
    }

    // Check for duplicate
    if (thresholdRepository.exists(data.server_id || null, data.metric_type, data.severity || 'warning')) {
      throw new BadRequestError('Threshold already exists for this metric type and severity');
    }

    const threshold = thresholdRepository.create(data);

    // Log creation
    if (userId) {
      auditLogRepository.create({
        user_id: userId,
        action: 'THRESHOLD_CREATED',
        details: { thresholdId: threshold.id, metricType: data.metric_type },
      });
    }

    logger.info('Threshold created', { thresholdId: threshold.id });

    const thresholdWithServer = thresholdRepository.findByIdWithServer(threshold.id)!;
    return this.toThresholdResponseDTO(thresholdWithServer);
  }

  /**
   * Update threshold
   */
  public updateThreshold(id: string, data: UpdateThresholdDTO, userId?: string): ThresholdResponseDTO {
    const existing = thresholdRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Threshold with ID ${id} not found`);
    }

    const threshold = thresholdRepository.update(id, data);

    // Log update
    if (userId) {
      auditLogRepository.create({
        user_id: userId,
        action: 'THRESHOLD_UPDATED',
        details: { thresholdId: id, changes: data },
      });
    }

    logger.info('Threshold updated', { thresholdId: id });

    const thresholdWithServer = thresholdRepository.findByIdWithServer(threshold!.id)!;
    return this.toThresholdResponseDTO(thresholdWithServer);
  }

  /**
   * Delete threshold
   */
  public deleteThreshold(id: string, userId?: string): void {
    const threshold = thresholdRepository.findById(id);
    if (!threshold) {
      throw new NotFoundError(`Threshold with ID ${id} not found`);
    }

    thresholdRepository.update(id, { enabled: false });

    // Log deletion
    if (userId) {
      auditLogRepository.create({
        user_id: userId,
        action: 'THRESHOLD_DELETED',
        details: { thresholdId: id },
      });
    }

    logger.info('Threshold deleted', { thresholdId: id });
  }

  /**
   * Initialize default thresholds
   */
  public initializeDefaultThresholds(): void {
    const defaults = thresholdRepository.getDefaultThresholds();
    
    for (const threshold of defaults) {
      if (!thresholdRepository.exists(null, threshold.metric_type, threshold.severity || 'warning')) {
        thresholdRepository.create(threshold);
        logger.info('Default threshold created', { 
          metricType: threshold.metric_type, 
          severity: threshold.severity 
        });
      }
    }
  }

  /**
   * Convert AlertWithDetails to ResponseDTO
   */
  private toAlertResponseDTO(alert: AlertWithDetails): AlertResponseDTO {
    return {
      id: alert.id,
      server_id: alert.server_id,
      server_name: alert.server_name,
      threshold_id: alert.threshold_id,
      message: alert.message,
      severity: alert.severity,
      acknowledged: alert.acknowledged,
      acknowledged_by: alert.acknowledged_by,
      acknowledged_at: alert.acknowledged_at,
      resolved: alert.resolved,
      resolved_at: alert.resolved_at,
      created_at: alert.created_at,
    };
  }

  /**
   * Convert ThresholdWithServer to ResponseDTO
   */
  private toThresholdResponseDTO(threshold: ThresholdWithServer): ThresholdResponseDTO {
    return {
      id: threshold.id,
      server_id: threshold.server_id,
      server_name: threshold.server_name,
      metric_type: threshold.metric_type,
      threshold_value: threshold.threshold_value,
      severity: threshold.severity,
      enabled: threshold.enabled,
      created_at: threshold.created_at,
    };
  }
}

export const alertService = new AlertService();
export default alertService;
