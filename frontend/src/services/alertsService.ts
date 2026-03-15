/**
 * Alerts Service
 * Servicios de alertas y umbrales
 */

import api, { ApiResponse } from './api';

// ==================== TYPES ====================

export interface Alert {
  id: string;
  server_id: string;
  server_name?: string;
  threshold_id?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
  acknowledged: boolean;
  created_at: string;
  resolved_at?: string;
  acknowledged_at?: string;
}

export interface AlertThreshold {
  id: string;
  server_id: string;
  metric_type: 'cpu' | 'memory' | 'disk';
  threshold_value: number;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

export interface CreateThresholdData {
  server_id: string;
  metric_type: 'cpu' | 'memory' | 'disk';
  threshold_value: number;
  severity: 'info' | 'warning' | 'critical';
}

export interface UpdateThresholdData {
  threshold_value?: number;
  severity?: 'info' | 'warning' | 'critical';
}

export interface AlertListResponse {
  alerts: Alert[];
  total: number;
}

export interface ThresholdListResponse {
  thresholds: AlertThreshold[];
}

// ==================== ALERTS SERVICE ====================

export const alertsService = {
  /**
   * Obtener todas las alertas
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    severity?: string;
    resolved?: boolean;
  }): Promise<AlertListResponse> {
    const response = await api.get<ApiResponse<AlertListResponse>>(
      '/alerts',
      { params }
    );
    return response.data.data;
  },

  /**
   * Obtener alertas activas
   */
  async getActive(): Promise<Alert[]> {
    const response = await api.get<ApiResponse<{ alerts: Alert[] }>>(
      '/alerts/active'
    );
    return response.data.data.alerts || [];
  },

  /**
   * Obtener alerta por ID
   */
  async getById(id: string): Promise<Alert> {
    const response = await api.get<ApiResponse<{ alert: Alert }>>(
      `/alerts/${id}`
    );
    return response.data.data.alert;
  },

  /**
   * Reconocer alerta
   */
  async acknowledge(id: string): Promise<Alert> {
    const response = await api.put<ApiResponse<{ alert: Alert }>>(
      `/alerts/${id}/acknowledge`
    );
    return response.data.data.alert;
  },

  /**
   * Resolver alerta
   */
  async resolve(id: string): Promise<Alert> {
    const response = await api.put<ApiResponse<{ alert: Alert }>>(
      `/alerts/${id}/resolve`
    );
    return response.data.data.alert;
  },

  /**
   * Obtener todos los umbrales
   */
  async getThresholds(): Promise<AlertThreshold[]> {
    const response = await api.get<ApiResponse<ThresholdListResponse>>(
      '/alerts/thresholds'
    );
    return response.data.data.thresholds || [];
  },

  /**
   * Crear umbral
   */
  async createThreshold(data: CreateThresholdData): Promise<AlertThreshold> {
    const response = await api.post<ApiResponse<{ threshold: AlertThreshold }>>(
      '/alerts/thresholds',
      data
    );
    return response.data.data.threshold;
  },

  /**
   * Actualizar umbral
   */
  async updateThreshold(
    id: string,
    data: UpdateThresholdData
  ): Promise<AlertThreshold> {
    const response = await api.put<ApiResponse<{ threshold: AlertThreshold }>>(
      `/alerts/thresholds/${id}`,
      data
    );
    return response.data.data.threshold;
  },

  /**
   * Eliminar umbral
   */
  async deleteThreshold(id: string): Promise<void> {
    await api.delete(`/alerts/thresholds/${id}`);
  },
};

export default alertsService;
