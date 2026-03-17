/**
 * Server Entry Point
 * Plataforma de Monitoreo en Tiempo Real
 */

import http from 'http';
import { app } from './app';
import { logger } from './utils/logger';
import { initializeDatabase } from './database/connection';
import { runSeeds } from './database/seeds';
import { WebSocketGateway } from './websocket/WebSocketGateway';
import dotenv from 'dotenv';
import { alertService } from './services/AlertService';
import notificationService from './services/NotificationService';
import alertEvaluationService from './services/AlertEvaluationService';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket Gateway
let wsGateway: WebSocketGateway;

async function startServer(): Promise<void> {
  try {
    // Initialize database
    logger.info('Initializing database connection...');
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Run seeds (only inserts if data doesn't exist)
    logger.info('Running database seeds...');
    await runSeeds();
    logger.info('Seeds completed');

    alertService.initializeDefaultThresholds();

    // Initialize WebSocket
    wsGateway = new WebSocketGateway(server);
    notificationService.setGateway(wsGateway);
    logger.info('WebSocket gateway initialized');

    alertEvaluationService.start();

    // Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
      logger.info(`💓 Health check: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  alertEvaluationService.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  alertEvaluationService.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection', { error: reason.message, stack: reason.stack });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Start the server
startServer();

export { wsGateway };
