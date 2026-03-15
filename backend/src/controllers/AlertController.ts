/**
 * Alert Controller
 * Handles alert management operations
 */

import { Request, Response, NextFunction } from 'express';
import { alertService } from '../services/AlertService';
import { AlertQueryDTO, validateCreateThresholdDTO, validateUpdateThresholdDTO } from '../dtos/AlertDTO';

export class AlertController {
  /**
   * Get all alerts
   * GET /api/alerts
   */
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: AlertQueryDTO = {
        server_id: req.query.server_id as string,
        severity: req.query.severity as AlertQueryDTO['severity'],
        acknowledged: req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined,
        resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
        from_date: req.query.from_date as string,
        to_date: req.query.to_date as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = alertService.getAlerts(query);

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
   * Get active (unresolved) alerts
   * GET /api/alerts/active
   */
  public getActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const severity = req.query.severity as string | undefined;
      const alerts = alertService.getActiveAlerts(severity);

      res.json({
        success: true,
        data: { alerts, total: alerts.length },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get alert by ID
   * GET /api/alerts/:id
   */
  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const alert = alertService.getAlertById(id);

      res.json({
        success: true,
        data: { alert },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Acknowledge alert
   * PUT /api/alerts/:id/acknowledge
   */
  public acknowledge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const alert = alertService.acknowledgeAlert(id, req.user!.userId, req.user!.username);

      res.json({
        success: true,
        data: { alert, message: 'Alert acknowledged' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Resolve alert
   * PUT /api/alerts/:id/resolve
   */
  public resolve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const alert = alertService.resolveAlert(id, req.user?.userId);

      res.json({
        success: true,
        data: { alert, message: 'Alert resolved' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get alert statistics
   * GET /api/alerts/statistics
   */
  public getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { from_date, to_date } = req.query;
      const stats = alertService.getAlertStatistics(
        from_date as string | undefined,
        to_date as string | undefined
      );

      res.json({
        success: true,
        data: stats,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all thresholds
   * GET /api/alerts/thresholds
   */
  public getThresholds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const serverId = req.query.server_id as string | undefined;
      const thresholds = alertService.getThresholds(serverId);

      res.json({
        success: true,
        data: { thresholds },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create threshold
   * POST /api/alerts/thresholds
   */
  public createThreshold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input (throws if invalid)
      const createData = validateCreateThresholdDTO(req.body);
      const threshold = alertService.createThreshold(createData, req.user?.userId);

      res.status(201).json({
        success: true,
        data: { threshold },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update threshold
   * PUT /api/alerts/thresholds/:id
   */
  public updateThreshold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      // Validate input (throws if invalid)
      const updateData = validateUpdateThresholdDTO(req.body);
      const threshold = alertService.updateThreshold(id, updateData, req.user?.userId);

      res.json({
        success: true,
        data: { threshold },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete threshold
   * DELETE /api/alerts/thresholds/:id
   */
  public deleteThreshold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      alertService.deleteThreshold(id, req.user?.userId);

      res.json({
        success: true,
        data: { message: 'Threshold deleted successfully' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AlertController;
