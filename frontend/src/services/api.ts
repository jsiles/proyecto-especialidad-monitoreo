/**
 * API Configuration - Axios Instance
 * Configuración base para todas las llamadas HTTP al backend
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// ==================== CONFIGURATION ====================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 30000; // 30 segundos

// ==================== AXIOS INSTANCE ====================

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== REQUEST INTERCEPTOR ====================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Obtener token del localStorage
    const token = localStorage.getItem('authToken');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log de requests en desarrollo
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ==================== RESPONSE INTERCEPTOR ====================

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log de responses en desarrollo
    if (import.meta.env.DEV) {
      console.log(`[API] Response from ${response.config.url}:`, response.data);
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Manejo centralizado de errores
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;
      
      console.error(`[API] Error ${status}:`, data);
      
      // Si es 401 (No autorizado), limpiar token y redirigir a login
      if (status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Solo redirigir si no estamos en login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      // Si es 403 (Prohibido), mostrar mensaje
      if (status === 403) {
        console.warn('[API] Access forbidden - insufficient permissions');
      }
      
      // Si es 404 (No encontrado)
      if (status === 404) {
        console.warn('[API] Resource not found');
      }
      
      // Si es 500 (Error del servidor)
      if (status >= 500) {
        console.error('[API] Server error:', data);
      }
    } else if (error.request) {
      // Request enviado pero sin respuesta
      console.error('[API] No response received:', error.request);
    } else {
      // Error al configurar el request
      console.error('[API] Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Extrae el mensaje de error de una respuesta de API
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.error?.message || error.message || 'Error desconocido';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Error desconocido';
};

/**
 * Verifica si hay un token válido almacenado
 */
export const hasValidToken = (): boolean => {
  const token = localStorage.getItem('authToken');
  return !!token;
};

/**
 * Limpia la autenticación del usuario
 */
export const clearAuth = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

export default api;
