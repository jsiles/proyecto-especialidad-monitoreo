/**
 * WebSocket Gateway
 * Real-time communication for monitoring platform
 */

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { verifyToken } from '../utils/jwtUtils';

// ==================== INTERFACES ====================

export interface MetricUpdate {
  serverId: string;
  serverName: string;
  timestamp: Date;
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    networkIn: number;
    networkOut: number;
  };
}

export interface AlertNotification {
  id: string;
  serverId: string;
  serverName: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface ServerStatusChange {
  serverId: string;
  serverName: string;
  previousStatus: 'online' | 'offline' | 'degraded' | 'unknown';
  currentStatus: 'online' | 'offline' | 'degraded' | 'unknown';
  timestamp: Date;
}

export interface AlertAcknowledgedEvent {
  alertId: string;
  acknowledgedBy: string;
  timestamp: Date;
}

export interface AlertResolvedEvent {
  alertId: string;
  resolvedAt: Date;
}

// ==================== WEBSOCKET GATEWAY ====================

export class WebSocketGateway {
  private io: Server;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/ws',
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('WebSocket Gateway initialized');
  }

  // ==================== MIDDLEWARE ====================

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = await verifyToken(token);
        socket.data.userId = decoded.userId;
        socket.data.username = decoded.username;
        socket.data.roles = decoded.roles;

        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed', {
          socketId: socket.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        next(new Error('Invalid token'));
      }
    });
  }

  // ==================== EVENT HANDLERS ====================

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      this.connectedClients.set(socket.id, socket);

      logger.info('Client connected', {
        socketId: socket.id,
        userId,
        username: socket.data.username,
      });

      // Join rooms based on roles
      if (socket.data.roles?.includes('ADMIN')) {
        socket.join('admins');
      }
      socket.join('monitoring');

      // Subscribe to specific server metrics
      socket.on('subscribe:server', (serverId: string) => {
        socket.join(`server:${serverId}`);
        logger.debug('Client subscribed to server', { socketId: socket.id, serverId });
      });

      socket.on('unsubscribe:server', (serverId: string) => {
        socket.leave(`server:${serverId}`);
        logger.debug('Client unsubscribed from server', { socketId: socket.id, serverId });
      });

      // Subscribe to alerts
      socket.on('subscribe:alerts', () => {
        socket.join('alerts');
        logger.debug('Client subscribed to alerts', { socketId: socket.id });
      });

      // Acknowledge alert
      socket.on('alert:acknowledge', async (alertId: string) => {
        try {
          this.io.to('alerts').emit('alert:acknowledged', {
            alertId,
            acknowledgedBy: socket.data.username,
            timestamp: new Date(),
          });

          logger.info('Alert acknowledged via WebSocket', {
            alertId,
            userId,
            username: socket.data.username,
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to acknowledge alert' });
        }
      });

      // Request current status
      socket.on('request:currentStatus', () => {
        socket.emit('status:current', this.getCurrentStatus());
      });

      // Ping/Pong for keepalive
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Disconnect
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(socket.id);
        logger.info('Client disconnected', {
          socketId: socket.id,
          userId,
          reason,
        });
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error('Socket error', {
          socketId: socket.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    });
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Emit metric update to subscribed clients
   */
  public emitMetricUpdate(update: MetricUpdate): void {
    this.io.to('monitoring').emit('metrics:update', update);
    this.io.to(`server:${update.serverId}`).emit('metrics:server', update);
  }

  /**
   * Emit new alert
   */
  public emitAlert(alert: AlertNotification): void {
    this.io.to('alerts').emit('alert:new', alert);

    if (alert.type === 'critical') {
      this.io.to('admins').emit('alert:critical', alert);
    }

    logger.info('Alert emitted via WebSocket', {
      alertId: alert.id,
      type: alert.type,
      serverId: alert.serverId,
    });
  }

  public emitAlertAcknowledged(event: AlertAcknowledgedEvent): void {
    this.io.to('alerts').emit('alert:acknowledged', event);
  }

  public emitAlertResolved(event: AlertResolvedEvent): void {
    this.io.to('alerts').emit('alert:resolved', event);
  }

  /**
   * Emit server status change
   */
  public emitServerStatusChange(change: ServerStatusChange): void {
    this.io.to('monitoring').emit('server:statusChange', change);

    if (change.currentStatus === 'offline') {
      this.io.to('admins').emit('server:down', change);
    }
  }

  /**
   * Emit dashboard update
   */
  public emitDashboardUpdate(data: unknown): void {
    this.io.to('monitoring').emit('dashboard:update', data);
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get current status (for new connections)
   */
  private getCurrentStatus(): object {
    return {
      timestamp: new Date(),
      serversOnline: 0,
      serversOffline: 0,
      activeAlerts: 0,
      connectedClients: this.connectedClients.size,
    };
  }
}

export default WebSocketGateway;
