/**
 * Winston Logger Configuration
 * Structured logging for the monitoring platform
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, printf, align } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Determine log level based on environment
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const envLevel = process.env.LOG_LEVEL;
  
  if (envLevel) return envLevel;
  
  switch (env) {
    case 'production':
      return 'info';
    case 'test':
      return 'error';
    default:
      return 'debug';
  }
};

// Create logs directory path
const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

// Create the logger instance
export const logger = winston.createLogger({
  level: getLogLevel(),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { 
    service: 'monitoring-platform',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport (always active)
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        align(),
        consoleFormat
      ),
    }),
  ],
});

// Add file transports in non-test environments
if (process.env.NODE_ENV !== 'test') {
  // Error log file
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true,
  }));

  // Combined log file
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true,
  }));

  // Audit log file (for security events)
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'audit.log'),
    level: 'info',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    tailable: true,
  }));
}

// Audit logging helper
export const auditLog = (action: string, userId: string | null, details: Record<string, unknown>): void => {
  logger.info(`AUDIT: ${action}`, {
    audit: true,
    userId,
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
