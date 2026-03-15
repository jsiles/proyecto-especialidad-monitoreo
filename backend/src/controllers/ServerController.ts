/**
 * Server Management Controller
 * Handles server CRUD and status operations
 */

import { Request, Response, NextFunction } from 'express';
import { serverService } from '../services/ServerService';
import { monitoringService } from '../services/MonitoringService';
import { validateCreateServerDTO, validateUpdateServerDTO, ServerQueryDTO } from '../dtos/ServerDTO';

export class ServerController {
  /**
   * Get all servers
   * GET /api/servers
   */
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: ServerQueryDTO = {
        status: req.query.status as ServerQueryDTO['status'],
        type: req.query.type as ServerQueryDTO['type'],
        environment: req.query.environment as ServerQueryDTO['environment'],
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = serverService.getAll(query);

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
   * Get server by ID
   * GET /api/servers/:id
   */
  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const server = serverService.getById(id);

      res.json({
        success: true,
        data: { server },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new server
   * POST /api/servers
   */
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input (throws if invalid)
      const createData = validateCreateServerDTO(req.body);
      const server = serverService.create(createData, req.user?.userId);

      res.status(201).json({
        success: true,
        data: { server },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update server
   * PUT /api/servers/:id
   */
  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      // Validate input (throws if invalid)
      const updateData = validateUpdateServerDTO(req.body);
      const server = serverService.update(id, updateData, req.user?.userId);

      res.json({
        success: true,
        data: { server },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete server
   * DELETE /api/servers/:id
   */
  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      serverService.delete(id, req.user?.userId);

      res.json({
        success: true,
        data: { message: 'Server deleted successfully' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get server status
   * GET /api/servers/:id/status
   */
  public getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const server = serverService.getById(id);

      res.json({
        success: true,
        data: {
          serverId: id,
          status: server.status,
          lastCheck: new Date().toISOString(),
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get server statistics
   * GET /api/servers/statistics
   */
  public getStatistics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = serverService.getStatistics();

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
   * Get server metrics
   * GET /api/servers/:id/metrics
   */
  public getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const server = serverService.getById(id);
      const metrics = await monitoringService.getServerMetrics(id, server.name);

      res.json({
        success: true,
        data: metrics,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ServerController;
