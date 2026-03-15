/**
 * Report Service
 * Business logic for report generation and management
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { reportRepository, ReportQueryOptions } from '../repositories/ReportRepository';
import { serverRepository } from '../repositories/ServerRepository';
import { alertRepository } from '../repositories/AlertRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { Report, ReportGenerationOptions } from '../models/Report';
import { Server } from '../models/Server';
import { AlertWithDetails } from '../models/Alert';
import { NotFoundError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';

// Ensure reports directory exists
const REPORTS_DIR = process.env.REPORTS_DIR || './data/reports';
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

export class ReportService {
  /**
   * Get all reports with pagination
   */
  public getAll(options: ReportQueryOptions = {}): { reports: Report[]; total: number } {
    return reportRepository.findAll(options);
  }

  /**
   * Get report by ID
   */
  public getById(id: string): Report {
    const report = reportRepository.findById(id);
    if (!report) {
      throw new NotFoundError(`Report with ID ${id} not found`);
    }
    return report;
  }

  /**
   * Generate a report
   */
  public async generate(options: ReportGenerationOptions, userId?: string): Promise<Report> {
    logger.info('Starting report generation', { type: options.type, from: options.from_date, to: options.to_date });

    // Create report record
    const report = reportRepository.create({
      type: options.type,
      period_start: options.from_date,
      period_end: options.to_date,
      generated_by: userId,
      status: 'processing',
    });

    try {
      // Generate PDF based on type
      let pdfPath: string;
      
      switch (options.type) {
        case 'asfi':
          pdfPath = await this.generateAsfiReport(report.id, options);
          break;
        case 'daily':
          pdfPath = await this.generateDailyReport(report.id, options);
          break;
        case 'weekly':
          pdfPath = await this.generateWeeklyReport(report.id, options);
          break;
        case 'monthly':
          pdfPath = await this.generateMonthlyReport(report.id, options);
          break;
        default:
          pdfPath = await this.generateCustomReport(report.id, options);
      }

      // Get file size
      const stats = fs.statSync(pdfPath);

      // Update report with file info
      const updatedReport = reportRepository.update(report.id, {
        status: 'completed',
        file_path: pdfPath,
        file_size: stats.size,
      });

      logger.info('Report generated successfully', { reportId: report.id, path: pdfPath });

      // Log audit
      auditLogRepository.create({
        user_id: userId,
        action: 'REPORT_GENERATED',
        details: { reportId: report.id, type: options.type },
      });

      return updatedReport!;
    } catch (error) {
      logger.error('Failed to generate report', { reportId: report.id, error });

      // Update report with error
      reportRepository.update(report.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Generate ASFI compliance report
   */
  private async generateAsfiReport(reportId: string, options: ReportGenerationOptions): Promise<string> {
    const filePath = path.join(REPORTS_DIR, `asfi-report-${reportId}.pdf`);
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        this.addHeader(doc, 'Reporte de Cumplimiento ASFI');
        this.addSubheader(doc, `Resolución ASFI N° 362/2021`);
        this.addPeriod(doc, options.from_date, options.to_date);

        // Get data
        const servers: Server[] = serverRepository.findAll({});
        const alerts: AlertWithDetails[] = alertRepository.findAll({ 
          from_date: options.from_date, 
          to_date: options.to_date 
        });

        // Section 1: Executive Summary
        doc.moveDown(2);
        this.addSectionTitle(doc, '1. Resumen Ejecutivo');
        doc.fontSize(11).font('Helvetica');
        
        const activeAlerts = alerts.filter((a: AlertWithDetails) => !a.resolved);
        const resolvedAlerts = alerts.filter((a: AlertWithDetails) => a.resolved);
        const criticalAlerts = alerts.filter((a: AlertWithDetails) => a.severity === 'critical');
        
        doc.text(`• Total de servidores monitoreados: ${servers.length}`);
        doc.text(`• Alertas generadas en el período: ${alerts.length}`);
        doc.text(`• Alertas críticas: ${criticalAlerts.length}`);
        doc.text(`• Alertas resueltas: ${resolvedAlerts.length}`);
        doc.text(`• Alertas pendientes: ${activeAlerts.length}`);

        // Section 2: Availability
        doc.moveDown(2);
        this.addSectionTitle(doc, '2. Disponibilidad de Servicios');
        
        const availability = this.calculateAvailability(servers, alerts, options);
        doc.fontSize(11).font('Helvetica');
        doc.text(`Disponibilidad promedio del sistema: ${availability.toFixed(2)}%`);
        
        doc.moveDown();
        doc.text('Disponibilidad por servidor:', { underline: true });
        doc.moveDown(0.5);

        servers.forEach((server: Server) => {
          const serverAlerts = alerts.filter((a: AlertWithDetails) => a.server_id === server.id);
          const serverAvailability = this.calculateServerAvailability(serverAlerts, options);
          doc.text(`  • ${server.name}: ${serverAvailability.toFixed(2)}%`);
        });

        // Section 3: Incidents
        doc.moveDown(2);
        this.addSectionTitle(doc, '3. Incidentes del Período');
        
        if (alerts.length === 0) {
          doc.fontSize(11).font('Helvetica');
          doc.text('No se registraron incidentes en el período analizado.');
        } else {
          // Table header
          doc.fontSize(10).font('Helvetica-Bold');
          doc.moveDown();
          
          const tableTop = doc.y;
          const tableLeft = 50;
          
          doc.text('Fecha', tableLeft, tableTop);
          doc.text('Servidor', tableLeft + 80, tableTop);
          doc.text('Severidad', tableLeft + 180, tableTop);
          doc.text('Descripción', tableLeft + 260, tableTop);
          
          doc.moveTo(tableLeft, tableTop + 15).lineTo(550, tableTop + 15).stroke();

          // Table rows
          doc.font('Helvetica').fontSize(9);
          let y = tableTop + 25;

          // Limit to first 20 alerts to fit in page
          const displayAlerts = alerts.slice(0, 20);
          displayAlerts.forEach((alert: AlertWithDetails) => {
            if (y > 700) {
              doc.addPage();
              y = 50;
            }
            
            const date = new Date(alert.created_at).toLocaleDateString('es-BO');
            doc.text(date, tableLeft, y, { width: 75 });
            doc.text(alert.server_name || 'N/A', tableLeft + 80, y, { width: 95 });
            doc.text(alert.severity.toUpperCase(), tableLeft + 180, y, { width: 75 });
            doc.text(alert.message.substring(0, 40), tableLeft + 260, y, { width: 240 });
            y += 20;
          });

          if (alerts.length > 20) {
            doc.text(`... y ${alerts.length - 20} incidentes adicionales`, tableLeft, y + 10);
          }
        }

        // Section 4: Metrics Performance
        doc.addPage();
        this.addSectionTitle(doc, '4. Métricas de Rendimiento');
        
        doc.fontSize(11).font('Helvetica');
        doc.moveDown();
        doc.text('Umbrales de alertas configurados:');
        doc.moveDown(0.5);
        doc.text('  • CPU: Warning > 70%, Critical > 90%');
        doc.text('  • Memoria: Warning > 75%, Critical > 95%');
        doc.text('  • Disco: Warning > 80%, Critical > 95%');

        // Section 5: Compliance
        doc.moveDown(2);
        this.addSectionTitle(doc, '5. Cumplimiento de SLAs');
        
        doc.fontSize(11).font('Helvetica');
        const slaTarget = 99.5;
        const slaStatus = availability >= slaTarget ? 'CUMPLIDO' : 'NO CUMPLIDO';
        doc.text(`Objetivo SLA: ${slaTarget}%`);
        doc.text(`Disponibilidad alcanzada: ${availability.toFixed(2)}%`);
        doc.text(`Estado: ${slaStatus}`, { continued: false });

        // Section 6: MTTR/MTBF
        doc.moveDown(2);
        this.addSectionTitle(doc, '6. Indicadores MTTR y MTBF');
        
        const mttr = this.calculateMTTR(alerts);
        const mtbf = this.calculateMTBF(alerts, options);
        
        doc.fontSize(11).font('Helvetica');
        doc.text(`MTTR (Mean Time To Repair): ${mttr.toFixed(1)} minutos`);
        doc.text(`MTBF (Mean Time Between Failures): ${mtbf.toFixed(1)} horas`);

        // Section 7: Recommendations
        doc.moveDown(2);
        this.addSectionTitle(doc, '7. Recomendaciones');
        
        doc.fontSize(11).font('Helvetica');
        if (criticalAlerts.length > 0) {
          doc.text('• Revisar configuración de servidores con alertas críticas recurrentes');
        }
        if (availability < slaTarget) {
          doc.text('• Implementar medidas para mejorar la disponibilidad del sistema');
        }
        if (mttr > 30) {
          doc.text('• Optimizar procedimientos de respuesta ante incidentes');
        }
        doc.text('• Mantener monitoreo continuo según Resolución ASFI N° 362/2021');

        // Footer
        this.addFooter(doc);

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate daily report
   */
  private async generateDailyReport(reportId: string, options: ReportGenerationOptions): Promise<string> {
    const filePath = path.join(REPORTS_DIR, `daily-report-${reportId}.pdf`);
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        this.addHeader(doc, 'Reporte Diario de Monitoreo');
        this.addPeriod(doc, options.from_date, options.to_date);

        const servers: Server[] = serverRepository.findAll({});
        const alerts: AlertWithDetails[] = alertRepository.findAll({ 
          from_date: options.from_date, 
          to_date: options.to_date 
        });

        // Summary
        doc.moveDown(2);
        this.addSectionTitle(doc, 'Resumen del Día');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Servidores monitoreados: ${servers.length}`);
        doc.text(`Alertas generadas: ${alerts.length}`);
        doc.text(`Alertas críticas: ${alerts.filter((a: AlertWithDetails) => a.severity === 'critical').length}`);
        doc.text(`Alertas resueltas: ${alerts.filter((a: AlertWithDetails) => a.resolved).length}`);

        // Server status
        doc.moveDown(2);
        this.addSectionTitle(doc, 'Estado de Servidores');
        doc.fontSize(10).font('Helvetica');
        
        servers.forEach((server: Server) => {
          const serverAlerts = alerts.filter((a: AlertWithDetails) => a.server_id === server.id);
          doc.text(`• ${server.name} (${server.ip_address}): ${server.status.toUpperCase()} - ${serverAlerts.length} alertas`);
        });

        this.addFooter(doc);
        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate weekly report
   */
  private async generateWeeklyReport(reportId: string, options: ReportGenerationOptions): Promise<string> {
    const filePath = path.join(REPORTS_DIR, `weekly-report-${reportId}.pdf`);
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        this.addHeader(doc, 'Reporte Semanal de Monitoreo');
        this.addPeriod(doc, options.from_date, options.to_date);

        const servers: Server[] = serverRepository.findAll({});
        const alerts: AlertWithDetails[] = alertRepository.findAll({ 
          from_date: options.from_date, 
          to_date: options.to_date 
        });
        const availability = this.calculateAvailability(servers, alerts, options);

        // Summary
        doc.moveDown(2);
        this.addSectionTitle(doc, 'Resumen Semanal');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Disponibilidad promedio: ${availability.toFixed(2)}%`);
        doc.text(`Total de alertas: ${alerts.length}`);
        doc.text(`Alertas críticas: ${alerts.filter((a: AlertWithDetails) => a.severity === 'critical').length}`);
        doc.text(`Tiempo de resolución promedio: ${this.calculateMTTR(alerts).toFixed(1)} minutos`);

        // Alerts by severity
        doc.moveDown(2);
        this.addSectionTitle(doc, 'Alertas por Severidad');
        doc.fontSize(11).font('Helvetica');
        
        const criticalCount = alerts.filter((a: AlertWithDetails) => a.severity === 'critical').length;
        const warningCount = alerts.filter((a: AlertWithDetails) => a.severity === 'warning').length;
        const infoCount = alerts.filter((a: AlertWithDetails) => a.severity === 'info').length;
        
        doc.text(`• Críticas: ${criticalCount}`);
        doc.text(`• Advertencias: ${warningCount}`);
        doc.text(`• Informativas: ${infoCount}`);

        this.addFooter(doc);
        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate monthly report
   */
  private async generateMonthlyReport(reportId: string, options: ReportGenerationOptions): Promise<string> {
    const filePath = path.join(REPORTS_DIR, `monthly-report-${reportId}.pdf`);
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        this.addHeader(doc, 'Reporte Mensual de Monitoreo');
        this.addPeriod(doc, options.from_date, options.to_date);

        const servers: Server[] = serverRepository.findAll({});
        const alerts: AlertWithDetails[] = alertRepository.findAll({ 
          from_date: options.from_date, 
          to_date: options.to_date 
        });

        // Executive summary
        doc.moveDown(2);
        this.addSectionTitle(doc, 'Resumen Ejecutivo');
        
        const availability = this.calculateAvailability(servers, alerts, options);
        doc.fontSize(11).font('Helvetica');
        doc.text(`Disponibilidad del mes: ${availability.toFixed(2)}%`);
        doc.text(`Servidores monitoreados: ${servers.length}`);
        doc.text(`Total de incidentes: ${alerts.length}`);
        doc.text(`MTTR: ${this.calculateMTTR(alerts).toFixed(1)} minutos`);
        doc.text(`MTBF: ${this.calculateMTBF(alerts, options).toFixed(1)} horas`);

        // Server performance
        doc.moveDown(2);
        this.addSectionTitle(doc, 'Rendimiento por Servidor');
        doc.fontSize(10).font('Helvetica');
        
        servers.forEach((server: Server) => {
          const serverAlerts = alerts.filter((a: AlertWithDetails) => a.server_id === server.id);
          const serverAvailability = this.calculateServerAvailability(serverAlerts, options);
          doc.text(`• ${server.name}: ${serverAvailability.toFixed(2)}% disponibilidad, ${serverAlerts.length} alertas`);
        });

        this.addFooter(doc);
        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate custom report
   */
  private async generateCustomReport(reportId: string, options: ReportGenerationOptions): Promise<string> {
    const filePath = path.join(REPORTS_DIR, `custom-report-${reportId}.pdf`);
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        this.addHeader(doc, 'Reporte Personalizado de Monitoreo');
        this.addPeriod(doc, options.from_date, options.to_date);

        const alerts: AlertWithDetails[] = alertRepository.findAll({ 
          from_date: options.from_date, 
          to_date: options.to_date 
        });

        doc.moveDown(2);
        this.addSectionTitle(doc, 'Datos del Período');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Total de alertas: ${alerts.length}`);
        doc.text(`Alertas resueltas: ${alerts.filter((a: AlertWithDetails) => a.resolved).length}`);
        doc.text(`Alertas pendientes: ${alerts.filter((a: AlertWithDetails) => !a.resolved).length}`);

        this.addFooter(doc);
        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get report file path for download
   */
  public getFilePath(id: string): string {
    const report = this.getById(id);
    
    if (!report.file_path) {
      throw new NotFoundError('Report file not available');
    }

    if (!fs.existsSync(report.file_path)) {
      throw new NotFoundError('Report file not found on disk');
    }

    return report.file_path;
  }

  /**
   * Delete a report
   */
  public delete(id: string, userId?: string): void {
    const report = this.getById(id);

    // Delete file if exists
    if (report.file_path && fs.existsSync(report.file_path)) {
      fs.unlinkSync(report.file_path);
    }

    reportRepository.delete(id);

    auditLogRepository.create({
      user_id: userId,
      action: 'REPORT_DELETED',
      details: { reportId: id, type: report.type },
    });
  }

  /**
   * Get report statistics
   */
  public getStatistics() {
    return reportRepository.getStatistics();
  }

  // ==================== HELPER METHODS ====================

  private addHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text(title, { align: 'center' });
    doc.moveDown(0.5);
    
    // Line separator
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  }

  private addSubheader(doc: PDFKit.PDFDocument, text: string): void {
    doc.fontSize(14).font('Helvetica');
    doc.text(text, { align: 'center' });
  }

  private addPeriod(doc: PDFKit.PDFDocument, from: string, to: string): void {
    doc.fontSize(10).font('Helvetica');
    doc.moveDown(0.5);
    doc.text(`Período: ${new Date(from).toLocaleDateString('es-BO')} - ${new Date(to).toLocaleDateString('es-BO')}`, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString('es-BO')}`, { align: 'center' });
  }

  private addSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(title);
    doc.moveDown(0.5);
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica');
      doc.text(
        `Plataforma de Monitoreo - Página ${i + 1} de ${pages.count}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }
  }

  private calculateAvailability(servers: Server[], alerts: AlertWithDetails[], _options: ReportGenerationOptions): number {
    if (servers.length === 0) return 100;

    let totalAvailability = 0;
    servers.forEach((server: Server) => {
      const serverAlerts = alerts.filter((a: AlertWithDetails) => a.server_id === server.id);
      const serverAvailability = this.calculateServerAvailability(serverAlerts, _options);
      totalAvailability += serverAvailability;
    });

    return totalAvailability / servers.length;
  }

  private calculateServerAvailability(alerts: AlertWithDetails[], _options: ReportGenerationOptions): number {
    // Simplified calculation: assume each unresolved alert represents 0.5% downtime
    const unresolvedCount = alerts.filter((a: AlertWithDetails) => !a.resolved).length;
    const downtime = Math.min(unresolvedCount * 0.5, 20); // Cap at 20%
    return Math.max(80, 100 - downtime);
  }

  private calculateMTTR(alerts: AlertWithDetails[]): number {
    const resolvedAlerts = alerts.filter((a: AlertWithDetails) => a.resolved && a.resolved_at);
    
    if (resolvedAlerts.length === 0) return 0;

    let totalMinutes = 0;
    resolvedAlerts.forEach((alert: AlertWithDetails) => {
      const created = new Date(alert.created_at).getTime();
      const resolved = new Date(alert.resolved_at!).getTime();
      totalMinutes += (resolved - created) / (1000 * 60);
    });

    return totalMinutes / resolvedAlerts.length;
  }

  private calculateMTBF(alerts: AlertWithDetails[], options: ReportGenerationOptions): number {
    if (alerts.length <= 1) {
      const from = new Date(options.from_date).getTime();
      const to = new Date(options.to_date).getTime();
      return (to - from) / (1000 * 60 * 60);
    }

    const sortedAlerts = [...alerts].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let totalHours = 0;
    for (let i = 1; i < sortedAlerts.length; i++) {
      const prev = new Date(sortedAlerts[i - 1].created_at).getTime();
      const curr = new Date(sortedAlerts[i].created_at).getTime();
      totalHours += (curr - prev) / (1000 * 60 * 60);
    }

    return totalHours / (sortedAlerts.length - 1);
  }
}

// Export singleton instance
export const reportService = new ReportService();
