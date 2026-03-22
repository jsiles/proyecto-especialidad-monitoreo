/**
 * MetricsController - Endpoints para métricas de Prometheus
 * Proporciona acceso a métricas en tiempo real y históricas
 */

import { Request, Response, NextFunction } from 'express';
import prometheusService from '../services/PrometheusService';
import { logger } from '../utils/logger';

export class MetricsController {
  /**
   * GET /api/metrics - Obtener métricas actuales de todos los servidores
   */
  async getCurrentMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await prometheusService.getCurrentMetrics();

      res.json({
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date().toISOString(),
          count: metrics.length,
        },
      });
    } catch (error: any) {
      logger.error('Error getting current metrics', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/metrics/server/:serverId/history - Obtener histórico de un servidor
   */
  async getServerHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { serverId } = req.params;
      const { start, end, step = '1m' } = req.query;

      if (!start || !end) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Los parámetros start y end son requeridos',
          },
        });
        return;
      }

      const startTime = parseInt(start as string);
      const endTime = parseInt(end as string);

      const history = await prometheusService.getServerMetricsHistory(
        serverId,
        startTime,
        endTime,
        step as string
      );

      res.json({
        success: true,
        data: history,
        meta: {
          timestamp: new Date().toISOString(),
          serverId,
          range: { start: startTime, end: endTime, step },
        },
      });
    } catch (error: any) {
      logger.error('Error getting server history', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/metrics/spi - Obtener métricas del SPI
   */
  async getSPIMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await prometheusService.getSPIMetrics();

      res.json({
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date().toISOString(),
          system: 'SPI',
        },
      });
    } catch (error: any) {
      logger.error('Error getting SPI metrics', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/metrics/atc - Obtener métricas del ATC
   */
  async getATCMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await prometheusService.getATCMetrics();

      res.json({
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date().toISOString(),
          system: 'ATC',
        },
      });
    } catch (error: any) {
      logger.error('Error getting ATC metrics', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/metrics/linkser - Obtener métricas de Linkser
   */
  async getLinkserMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await prometheusService.getLinkserMetrics();

      res.json({
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date().toISOString(),
          system: 'LINKSER',
        },
      });
    } catch (error: any) {
      logger.error('Error getting Linkser metrics', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/metrics/query - Ejecutar consulta personalizada de Prometheus
   */
  async executeQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, time } = req.body;

      if (!query) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QUERY',
            message: 'El parámetro query es requerido',
          },
        });
        return;
      }

      const result = await prometheusService.query(query, time);

      res.json({
        success: true,
        data: result.data,
        meta: {
          timestamp: new Date().toISOString(),
          query,
        },
      });
    } catch (error: any) {
      logger.error('Error executing custom query', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/metrics/query-range - Ejecutar consulta de rango
   */
  async executeRangeQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, start, end, step = '15s' } = req.body;

      if (!query || !start || !end) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Los parámetros query, start y end son requeridos',
          },
        });
        return;
      }

      const result = await prometheusService.queryRange(query, start, end, step);

      res.json({
        success: true,
        data: result.data,
        meta: {
          timestamp: new Date().toISOString(),
          query,
          range: { start, end, step },
        },
      });
    } catch (error: any) {
      logger.error('Error executing range query', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/metrics/health - Verificar conectividad con Prometheus
   */
  async healthCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isHealthy = await prometheusService.healthCheck();

      res.json({
        success: true,
        data: {
          prometheus: isHealthy ? 'connected' : 'disconnected',
          status: isHealthy ? 'healthy' : 'unhealthy',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Error checking Prometheus health', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/metrics/list - Listar todas las métricas disponibles
   */
  async listMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await prometheusService.getMetricNames();

      res.json({
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date().toISOString(),
          count: metrics.length,
        },
      });
    } catch (error: any) {
      logger.error('Error listing metrics', { error: error.message });
      next(error);
    }
  }
}

export default new MetricsController();
