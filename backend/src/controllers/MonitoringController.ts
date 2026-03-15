/**
 * Monitoring Controller
 * Handles metrics and monitoring operations
 */

import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/MonitoringService';
import { MetricsHistoryQueryDTO } from '../dtos/MetricsDTO';
import { BadRequestError } from '../middlewares/errorHandler';

export class MonitoringController {
  /**
   * Get current metrics for all servers
   * GET /api/metrics
   */
  public getCurrentMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await monitoringService.getCurrentMetrics();

      res.json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get metrics summary
   * GET /api/metrics/summary
   */
  public getSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await monitoringService.getCurrentMetrics();

      res.json({
        success: true,
        data: result.summary,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get historical metrics
   * GET /api/metrics/history
   */
  public getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { from, to, interval, server_id, metric_type } = req.query;

      if (!from || !to) {
        throw new BadRequestError('from and to dates are required');
      }

      const query: MetricsHistoryQueryDTO = {
        from_date: from as string,
        to_date: to as string,
        interval: interval as MetricsHistoryQueryDTO['interval'],
        server_id: server_id as string,
        metric_type: metric_type as MetricsHistoryQueryDTO['metric_type'],
      };

      const history = await monitoringService.getMetricsHistory(query);

      res.json({
        success: true,
        data: { history },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get server-specific historical metrics
   * GET /api/metrics/history/:serverId
   */
  public getServerHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { serverId } = req.params;
      const { from, to, interval, metric_type } = req.query;

      if (!from || !to) {
        throw new BadRequestError('from and to dates are required');
      }

      const query: MetricsHistoryQueryDTO = {
        from_date: from as string,
        to_date: to as string,
        interval: interval as MetricsHistoryQueryDTO['interval'],
        server_id: serverId,
        metric_type: metric_type as MetricsHistoryQueryDTO['metric_type'],
      };

      const history = await monitoringService.getMetricsHistory(query);

      res.json({
        success: true,
        data: { serverId, history },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get server current metrics
   * GET /api/metrics/server/:serverId
   */
  public getServerMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { serverId } = req.params;
      const metrics = await monitoringService.getServerMetrics(serverId);

      res.json({
        success: true,
        data: metrics,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get raw Prometheus metrics
   * GET /api/metrics/prometheus
   */
  public getPrometheusMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await monitoringService.getCurrentMetrics();

      res.json({
        success: true,
        data: {
          servers: result.servers,
          raw_metrics: result.servers.map(s => ({
            server_id: s.server_id,
            server_name: s.server_name,
            cpu_percent: s.metrics.cpu,
            memory_percent: s.metrics.memory,
            disk_percent: s.metrics.disk,
            status: s.status,
            timestamp: s.last_update,
          })),
        },
        meta: { 
          timestamp: new Date().toISOString(),
          source: 'prometheus',
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default MonitoringController;
