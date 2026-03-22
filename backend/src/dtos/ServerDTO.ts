/**
 * Server DTOs
 * Data Transfer Objects for server operations
 */

import { ServerType, ServerEnvironment, ServerStatus } from '../models/Server';

// Create server request
export interface CreateServerDTO {
  name: string;
  ip_address?: string;
  type?: ServerType;
  environment?: ServerEnvironment;
}

// Update server request
export interface UpdateServerDTO {
  name?: string;
  ip_address?: string;
  type?: ServerType;
  environment?: ServerEnvironment;
  status?: ServerStatus;
}

// Server response
export interface ServerResponseDTO {
  id: string;
  name: string;
  ip_address: string | null;
  type: ServerType | null;
  environment: ServerEnvironment | null;
  status: ServerStatus;
  created_at: string;
  updated_at: string;
  metrics?: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
  };
}

// Server list query params
export interface ServerQueryDTO {
  status?: ServerStatus;
  type?: ServerType;
  environment?: ServerEnvironment;
  search?: string;
  limit?: number;
  offset?: number;
}

// Valid server types and environments for validation
const VALID_TYPES: ServerType[] = ['application', 'database', 'web', 'cache', 'spi', 'atc', 'linkser', 'other'];
const VALID_ENVIRONMENTS: ServerEnvironment[] = ['production', 'staging', 'development', 'testing'];
const VALID_STATUSES: ServerStatus[] = ['online', 'offline', 'degraded', 'unknown'];

// Validation functions
export function validateCreateServerDTO(data: unknown): CreateServerDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { name, ip_address, type, environment } = data as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new Error('Server name must be at least 2 characters');
  }

  if (ip_address !== undefined && typeof ip_address !== 'string') {
    throw new Error('Invalid IP address format');
  }

  if (type !== undefined && !VALID_TYPES.includes(type as ServerType)) {
    throw new Error(`Invalid server type. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (environment !== undefined && !VALID_ENVIRONMENTS.includes(environment as ServerEnvironment)) {
    throw new Error(`Invalid environment. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`);
  }

  return {
    name: name.trim(),
    ip_address: ip_address ? String(ip_address).trim() : undefined,
    type: type as ServerType | undefined,
    environment: environment as ServerEnvironment | undefined,
  };
}

export function validateUpdateServerDTO(data: unknown): UpdateServerDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { name, ip_address, type, environment, status } = data as Record<string, unknown>;

  const result: UpdateServerDTO = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new Error('Server name must be at least 2 characters');
    }
    result.name = name.trim();
  }

  if (ip_address !== undefined) {
    result.ip_address = ip_address ? String(ip_address).trim() : undefined;
  }

  if (type !== undefined) {
    if (!VALID_TYPES.includes(type as ServerType)) {
      throw new Error(`Invalid server type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }
    result.type = type as ServerType;
  }

  if (environment !== undefined) {
    if (!VALID_ENVIRONMENTS.includes(environment as ServerEnvironment)) {
      throw new Error(`Invalid environment. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`);
    }
    result.environment = environment as ServerEnvironment;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status as ServerStatus)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    result.status = status as ServerStatus;
  }

  return result;
}
