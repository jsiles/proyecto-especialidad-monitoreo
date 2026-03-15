/**
 * Authentication DTOs
 * Data Transfer Objects for auth operations
 */

// Login request
export interface LoginDTO {
  username: string;
  password: string;
}

// Register request
export interface RegisterDTO {
  username: string;
  password: string;
  email?: string;
}

// Login response
export interface AuthResponseDTO {
  token: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    roles: string[];
  };
  expiresIn: string;
}

// Change password request
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// Token payload
export interface TokenPayloadDTO {
  userId: string;
  username: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

// Validation functions
export function validateLoginDTO(data: unknown): LoginDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { username, password } = data as Record<string, unknown>;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  return { username: username.trim(), password };
}

export function validateRegisterDTO(data: unknown): RegisterDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { username, password, email } = data as Record<string, unknown>;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  if (email !== undefined && typeof email !== 'string') {
    throw new Error('Invalid email format');
  }

  return {
    username: username.trim(),
    password,
    email: email ? email.trim() : undefined,
  };
}

export function validateChangePasswordDTO(data: unknown): ChangePasswordDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { currentPassword, newPassword } = data as Record<string, unknown>;

  if (!currentPassword || typeof currentPassword !== 'string') {
    throw new Error('Current password is required');
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  return { currentPassword, newPassword };
}
