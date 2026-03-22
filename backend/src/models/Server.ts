/**
 * Server Model
 * Entity representing a monitored server
 */

export interface Server {
  id: string;
  name: string;
  ip_address: string | null;
  type: ServerType | null;
  environment: ServerEnvironment | null;
  status: ServerStatus;
  created_at: string;
  updated_at: string;
}

export type ServerType = 'application' | 'database' | 'web' | 'cache' | 'spi' | 'atc' | 'linkser' | 'other';

export type ServerEnvironment = 'production' | 'staging' | 'development' | 'testing';

export type ServerStatus = 'online' | 'offline' | 'degraded' | 'unknown';

export interface ServerWithMetrics extends Server {
  metrics?: ServerMetrics;
}

export interface ServerMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network_in: number;
  network_out: number;
  uptime: number;
  timestamp: string;
}

// Type for creating a new server
export interface CreateServerInput {
  name: string;
  ip_address?: string;
  type?: ServerType;
  environment?: ServerEnvironment;
}

// Type for updating a server
export interface UpdateServerInput {
  name?: string;
  ip_address?: string;
  type?: ServerType;
  environment?: ServerEnvironment;
  status?: ServerStatus;
}

export default Server;
