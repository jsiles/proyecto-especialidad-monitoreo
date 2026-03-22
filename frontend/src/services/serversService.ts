/**
 * Server Service
 * Servicios de gestión de servidores
 */

import api, { ApiResponse } from './api';

// ==================== TYPES ====================

export interface Server {
  id: string;
  name: string;
  ip_address: string;
  type: 'application' | 'database' | 'web' | 'cache' | 'spi' | 'atc' | 'linkser' | 'other';
  environment: 'production' | 'staging' | 'development' | 'testing';
  status?: 'online' | 'offline' | 'degraded' | 'unknown';
  created_at: string;
  updated_at?: string;
}

export interface CreateServerData {
  name: string;
  ip_address: string;
  type?: Server['type'];
  environment?: Server['environment'];
}

export interface UpdateServerData {
  name?: string;
  ip_address?: string;
  type?: Server['type'];
  environment?: Server['environment'];
}

export interface ServerListResponse {
  servers: Server[];
  total: number;
}

export interface ServerStatus {
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  last_check: string;
}

export interface ServerMetrics {
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  timestamp: string;
}

// ==================== SERVER SERVICE ====================

export const serverService = {
  /**
   * Obtener lista de servidores
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<ServerListResponse> {
    const response = await api.get<ApiResponse<ServerListResponse>>(
      '/servers',
      { params }
    );
    return response.data.data;
  },

  /**
   * Obtener servidor por ID
   */
  async getById(id: string): Promise<Server> {
    const response = await api.get<ApiResponse<{ server: Server }>>(`/servers/${id}`);
    return response.data.data.server;
  },

  /**
   * Crear nuevo servidor
   */
  async create(data: CreateServerData): Promise<Server> {
    const response = await api.post<ApiResponse<{ server: Server }>>(
      '/servers',
      data
    );
    return response.data.data.server;
  },

  /**
   * Actualizar servidor
   */
  async update(id: string, data: UpdateServerData): Promise<Server> {
    const response = await api.put<ApiResponse<{ server: Server }>>(
      `/servers/${id}`,
      data
    );
    return response.data.data.server;
  },

  /**
   * Eliminar servidor
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/servers/${id}`);
  },

  /**
   * Obtener estado del servidor
   */
  async getStatus(id: string): Promise<ServerStatus> {
    const response = await api.get<ApiResponse<ServerStatus>>(
      `/servers/${id}/status`
    );
    return response.data.data;
  },

  /**
   * Obtener métricas del servidor
   */
  async getMetrics(id: string): Promise<ServerMetrics> {
    const response = await api.get<ApiResponse<ServerMetrics>>(
      `/servers/${id}/metrics`
    );
    return response.data.data;
  },
};

export default serverService;
