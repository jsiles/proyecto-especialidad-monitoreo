/**
 * Report Controller
 * Handles report generation and management
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { reportService } from '../services/ReportService';
import { BadRequestError } from '../middlewares/errorHandler';
import { auditLog } from '../utils/logger';
import { ReportType, ReportGenerationOptions } from '../models/Report';

export class ReportController {
  /**
   * Get all reports
   * GET /api/reports
   */
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, type, status } = req.query;

      const options = {
        type: type as ReportType | undefined,
        status: status as 'pending' | 'processing' | 'completed' | 'failed' | undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: page ? (parseInt(page as string) - 1) * (parseInt(limit as string) || 20) : 0,
      };

      const result = reportService.getAll(options);

      res.json({
        success: true,
        data: {
          reports: result.reports,
          total: result.total,
          page: parseInt(page as string) || 1,
          limit: options.limit,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get report by ID
   * GET /api/reports/:id
   */
  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const report = reportService.getById(id);

      res.json({
        success: true,
        data: { report },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate report
   * POST /api/reports/generate
   */
  public generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, from, to, include_charts, include_incidents, servers } = req.body;

      if (!type) {
        throw new BadRequestError('Report type is required');
      }

      if (!from || !to) {
        throw new BadRequestError('Date range (from, to) is required');
      }

      const validTypes: ReportType[] = ['daily', 'weekly', 'monthly', 'asfi', 'custom'];
      if (!validTypes.includes(type)) {
        throw new BadRequestError(`Invalid report type. Must be one of: ${validTypes.join(', ')}`);
      }

      const options: ReportGenerationOptions = {
        type,
        from_date: from,
        to_date: to,
        include_charts: include_charts || false,
        include_incidents: include_incidents || true,
        servers: servers || undefined,
      };

      const report = await reportService.generate(options, req.user?.userId);

      auditLog('REPORT_GENERATED', req.user?.userId || null, { 
        reportId: report.id, 
        type, 
        from, 
        to 
      });

      res.status(201).json({
        success: true,
        data: { report },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate ASFI compliance report
   * POST /api/reports/generate/asfi
   */
  public generateAsfi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { from, to } = req.body;

      if (!from || !to) {
        throw new BadRequestError('Date range (from, to) is required for ASFI report');
      }

      const options: ReportGenerationOptions = {
        type: 'asfi',
        from_date: from,
        to_date: to,
        include_charts: true,
        include_incidents: true,
      };

      const report = await reportService.generate(options, req.user?.userId);

      auditLog('REPORT_GENERATED', req.user?.userId || null, { 
        reportId: report.id, 
        type: 'asfi',
        from, 
        to 
      });

      res.status(201).json({
        success: true,
        data: { report },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Download report
   * GET /api/reports/:id/download
   */
  public download = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const filePath = reportService.getFilePath(id);
      const report = reportService.getById(id);

      auditLog('REPORT_DOWNLOADED', req.user?.userId || null, { reportId: id });

      // Set headers for PDF download
      const fileName = path.basename(filePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      if (report.file_size) {
        res.setHeader('Content-Length', report.file_size);
      }

      // Stream the file
      res.sendFile(filePath, { root: '.' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete report
   * DELETE /api/reports/:id
   */
  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      reportService.delete(id, req.user?.userId);

      auditLog('REPORT_DELETED', req.user?.userId || null, { reportId: id });

      res.json({
        success: true,
        data: { message: 'Report deleted successfully' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get report statistics
   * GET /api/reports/statistics
   */
  public getStatistics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = reportService.getStatistics();

      res.json({
        success: true,
        data: stats,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ReportController;
