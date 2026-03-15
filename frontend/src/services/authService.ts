/**
 * Authentication Service
 * Servicios de autenticación y gestión de usuarios
 */

import api, { ApiResponse } from './api';

// ==================== TYPES ====================

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  created_at: string;
  last_login?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ==================== AUTH SERVICE ====================

export const authService = {
  /**
   * Login de usuario
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      credentials
    );
    
    // Guardar token y usuario en localStorage
    if (response.data.success) {
      const { token, user } = response.data.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return response.data.data;
  },

  /**
   * Registro de nuevo usuario
   */
  async register(data: RegisterData): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>(
      '/auth/register',
      data
    );
    return response.data.data.user;
  },

  /**
   * Verificar token actual
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await api.get<ApiResponse<{ valid: boolean }>>(
        '/auth/verify'
      );
      return response.data.data.valid;
    } catch (error) {
      return false;
    }
  },

  /**
   * Logout del usuario
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Limpiar localStorage siempre
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Cambiar contraseña del usuario actual
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    await api.post('/auth/change-password', data);
  },

  /**
   * Obtener información del usuario actual
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  },

  /**
   * Obtener usuario del localStorage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  },

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const user = this.getStoredUser();
    return user?.roles?.includes(role) || false;
  },

  /**
   * Verificar si el usuario es admin
   */
  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  },
};

export default authService;
