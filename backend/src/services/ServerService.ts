/**
 * Server Service
 * Business logic for server management
 */

import { serverRepository } from '../repositories/ServerRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { CreateServerDTO, UpdateServerDTO, ServerResponseDTO, ServerQueryDTO } from '../dtos/ServerDTO';
import { Server, ServerStatus } from '../models/Server';
import { logger } from '../utils/logger';
import { NotFoundError, ConflictError } from '../middlewares/errorHandler';

export class ServerService {
  /**
   * Get all servers with optional filters
   */
  public getAll(query?: ServerQueryDTO): { servers: ServerResponseDTO[]; total: number } {
    const servers = serverRepository.findAll({
      status: query?.status,
      type: query?.type,
      environment: query?.environment,
      search: query?.search,
      limit: query?.limit || 100,
      offset: query?.offset || 0,
    });

    const total = serverRepository.count({
      status: query?.status,
      type: query?.type,
      environment: query?.environment,
    });

    return {
      servers: servers.map(this.toResponseDTO),
      total,
    };
  }

  /**
   * Get server by ID
   */
  public getById(id: string): ServerResponseDTO {
    const server = serverRepository.findById(id);
    if (!server) {
      throw new NotFoundError(`Server with ID ${id} not found`);
    }
    return this.toResponseDTO(server);
  }

  /**
   * Create new server
   */
  public create(data: CreateServerDTO, userId?: string): ServerResponseDTO {
    // Check for duplicate name
    if (serverRepository.findByName(data.name)) {
      throw new ConflictError(`Server with name '${data.name}' already exists`);
    }

    const server = serverRepository.create({
      name: data.name,
      ip_address: data.ip_address,
      type: data.type,
      environment: data.environment,
    });

    // Log creation
    auditLogRepository.create({
      user_id: userId,
      action: 'SERVER_CREATED',
      details: { serverId: server.id, name: server.name },
    });

    logger.info('Server created', { serverId: server.id, name: server.name });

    return this.toResponseDTO(server);
  }

  /**
   * Update server
   */
  public update(id: string, data: UpdateServerDTO, userId?: string): ServerResponseDTO {
    const existing = serverRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Server with ID ${id} not found`);
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = serverRepository.findByName(data.name);
      if (duplicate) {
        throw new ConflictError(`Server with name '${data.name}' already exists`);
      }
    }

    const server = serverRepository.update(id, data);

    // Log update
    auditLogRepository.create({
      user_id: userId,
      action: 'SERVER_UPDATED',
      details: { serverId: id, changes: data },
    });

    logger.info('Server updated', { serverId: id });

    return this.toResponseDTO(server!);
  }

  /**
   * Delete server
   */
  public delete(id: string, userId?: string): void {
    const server = serverRepository.findById(id);
    if (!server) {
      throw new NotFoundError(`Server with ID ${id} not found`);
    }

    serverRepository.delete(id);

    // Log deletion
    auditLogRepository.create({
      user_id: userId,
      action: 'SERVER_DELETED',
      details: { serverId: id, name: server.name },
    });

    logger.info('Server deleted', { serverId: id, name: server.name });
  }

  /**
   * Update server status
   */
  public updateStatus(id: string, status: ServerStatus): void {
    const server = serverRepository.findById(id);
    if (!server) {
      throw new NotFoundError(`Server with ID ${id} not found`);
    }

    serverRepository.updateStatus(id, status);
    logger.debug('Server status updated', { serverId: id, status });
  }

  /**
   * Get server statistics
   */
  public getStatistics(): {
    total: number;
    online: number;
    offline: number;
    degraded: number;
    unknown: number;
  } {
    return serverRepository.getStatistics();
  }

  /**
   * Get servers by status
   */
  public getByStatus(status: ServerStatus): ServerResponseDTO[] {
    const servers = serverRepository.findByStatus(status);
    return servers.map(this.toResponseDTO);
  }

  /**
   * Convert Server to ResponseDTO
   */
  private toResponseDTO(server: Server): ServerResponseDTO {
    return {
      id: server.id,
      name: server.name,
      ip_address: server.ip_address,
      type: server.type as ServerResponseDTO['type'],
      environment: server.environment as ServerResponseDTO['environment'],
      status: server.status,
      created_at: server.created_at,
      updated_at: server.updated_at,
    };
  }
}

export const serverService = new ServerService();
export default serverService;
