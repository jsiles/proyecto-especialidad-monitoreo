/**
 * Reports Service
 * Servicios de generación y gestión de reportes
 */

import api, { ApiResponse } from './api';

// ==================== TYPES ====================

export interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'asfi' | 'custom';
  period_start: string;
  period_end: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path?: string;
  file_size?: number;
  error_message?: string;
  generated_by: string;
  created_at: string;
  completed_at?: string;
}

export interface GenerateReportData {
  type: 'daily' | 'weekly' | 'monthly' | 'asfi' | 'custom';
  from: string;
  to: string;
  include_charts?: boolean;
  include_incidents?: boolean;
  servers?: string[];
}

export interface GenerateAsfiReportData {
  from: string;
  to: string;
}

export interface ReportListResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportStatistics {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

// ==================== REPORTS SERVICE ====================

export const reportsService = {
  /**
   * Obtener lista de reportes
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<ReportListResponse> {
    const response = await api.get<ApiResponse<ReportListResponse>>(
      '/reports',
      { params }
    );
    return response.data.data;
  },

  /**
   * Obtener reporte por ID
   */
  async getById(id: string): Promise<Report> {
    const response = await api.get<ApiResponse<{ report: Report }>>(
      `/reports/${id}`
    );
    return response.data.data.report;
  },

  /**
   * Generar nuevo reporte
   */
  async generate(data: GenerateReportData): Promise<Report> {
    const response = await api.post<ApiResponse<{ report: Report }>>(
      '/reports/generate',
      data
    );
    return response.data.data.report;
  },

  /**
   * Generar reporte ASFI
   */
  async generateAsfi(data: GenerateAsfiReportData): Promise<Report> {
    const response = await api.post<ApiResponse<{ report: Report }>>(
      '/reports/generate/asfi',
      data
    );
    return response.data.data.report;
  },

  /**
   * Descargar reporte PDF
   */
  async download(id: string): Promise<Blob> {
    const response = await api.get(`/reports/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Eliminar reporte
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/reports/${id}`);
  },

  /**
   * Obtener estadísticas de reportes
   */
  async getStatistics(): Promise<ReportStatistics> {
    const response = await api.get<ApiResponse<ReportStatistics>>(
      '/reports/statistics'
    );
    return response.data.data;
  },

  /**
   * Helper para descargar archivo con nombre correcto
   */
  async downloadWithFilename(id: string, report: Report): Promise<void> {
    const blob = await this.download(id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${report.type}-${report.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default reportsService;
