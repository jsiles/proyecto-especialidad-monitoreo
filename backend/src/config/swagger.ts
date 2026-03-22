/**
 * Swagger Configuration
 * OpenAPI 3.0 Documentation
 */

import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const normalizeGlobPath = (filePath: string): string => filePath.replace(/\\/g, '/');

const apiFiles = [
  normalizeGlobPath(path.resolve(__dirname, '../routes/*.{ts,js}')),
  normalizeGlobPath(path.resolve(__dirname, '../controllers/*.{ts,js}')),
  normalizeGlobPath(path.resolve(__dirname, '../models/*.{ts,js}')),
];

const baseDefinition: swaggerJsdoc.Options['definition'] = {
  openapi: '3.0.0',
  info: {
    title: 'Plataforma de Monitoreo en Tiempo Real - API',
    version: '1.0.0',
    description: `
API REST para la Plataforma de Monitoreo en Tiempo Real de Servidores y Servicios TI.
Diseñada para instituciones financieras bolivianas cumpliendo con la Resolución ASFI N° 362/2021.

## Características principales:
- Monitoreo en tiempo real de servidores y servicios
- Sistema de alertas configurables
- Generación de reportes PDF (ASFI compliance)
- WebSocket para notificaciones en tiempo real
- Integración con Prometheus y Grafana

## Autenticación:
Esta API utiliza JWT (JSON Web Tokens) para autenticación.
Para acceder a endpoints protegidos, incluye el token en el header Authorization:
\`Authorization: Bearer {token}\`

Obtén un token usando el endpoint POST /api/auth/login
    `,
    contact: {
      name: 'API Support',
      email: 'support@monitoring.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /api/auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Invalid request parameters',
              },
              details: {
                type: 'object',
              },
            },
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
              requestId: {
                type: 'string',
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'usr_123456',
          },
          username: {
            type: 'string',
            example: 'admin',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@example.com',
          },
          roles: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['ADMIN', 'OPERATOR', 'VIEWER'],
            },
            example: ['ADMIN'],
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Server: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'srv_001',
          },
          name: {
            type: 'string',
            example: 'Server-APP-01',
          },
          ip_address: {
            type: 'string',
            example: '192.168.1.100',
          },
          type: {
            type: 'string',
            enum: ['application', 'database', 'web', 'cache', 'spi', 'atc', 'linkser', 'other'],
            example: 'application',
          },
          environment: {
            type: 'string',
            enum: ['production', 'staging', 'development', 'testing'],
            example: 'production',
          },
          status: {
            type: 'string',
            enum: ['online', 'offline', 'degraded', 'unknown'],
            example: 'online',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Alert: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'alt_123456',
          },
          server_id: {
            type: 'string',
            example: 'srv_001',
          },
          server_name: {
            type: 'string',
            example: 'Server-APP-01',
          },
          threshold_id: {
            type: 'string',
            example: 'thr_001',
          },
          message: {
            type: 'string',
            example: 'CPU usage exceeded 80%',
          },
          severity: {
            type: 'string',
            enum: ['info', 'warning', 'critical'],
            example: 'warning',
          },
          resolved: {
            type: 'boolean',
            example: false,
          },
          acknowledged: {
            type: 'boolean',
            example: false,
          },
          acknowledged_by: {
            type: 'string',
            nullable: true,
            example: 'admin',
          },
          acknowledged_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          resolved_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },
      Threshold: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'thr_001',
          },
          server_id: {
            type: 'string',
            nullable: true,
            example: 'srv_001',
          },
          server_name: {
            type: 'string',
            nullable: true,
            example: 'Server-APP-01',
          },
          metric_type: {
            type: 'string',
            enum: ['cpu', 'memory', 'disk', 'network_in', 'network_out', 'latency'],
            example: 'cpu',
          },
          threshold_value: {
            type: 'number',
            format: 'float',
            example: 85,
          },
          severity: {
            type: 'string',
            enum: ['warning', 'critical'],
            example: 'warning',
          },
          enabled: {
            type: 'boolean',
            example: true,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      MessageResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Operation completed successfully',
              },
            },
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
      Report: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'rpt_123456',
          },
          type: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly', 'asfi', 'custom'],
            example: 'asfi',
          },
          period_start: {
            type: 'string',
            format: 'date',
            example: '2026-03-01',
          },
          period_end: {
            type: 'string',
            format: 'date',
            example: '2026-03-15',
          },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
            example: 'completed',
          },
          file_path: {
            type: 'string',
            example: './data/reports/asfi-report-rpt_123456.pdf',
          },
          file_size: {
            type: 'integer',
            example: 524288,
          },
          generated_by: {
            type: 'string',
            example: 'usr_123456',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          completed_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },
      ServerMetrics: {
        type: 'object',
        properties: {
          server_id: {
            type: 'string',
            example: 'srv_001',
          },
          server_name: {
            type: 'string',
            example: 'Server-APP-01',
          },
          status: {
            type: 'string',
            enum: ['online', 'offline', 'degraded', 'unknown'],
            example: 'online',
          },
          metrics: {
            type: 'object',
            properties: {
              cpu: {
                type: 'number',
                format: 'float',
                example: 45.5,
              },
              memory: {
                type: 'number',
                format: 'float',
                example: 62.3,
              },
              disk: {
                type: 'number',
                format: 'float',
                example: 55.0,
              },
              network_in: {
                type: 'number',
                format: 'float',
                example: 1024.5,
              },
              network_out: {
                type: 'number',
                format: 'float',
                example: 512.3,
              },
              uptime: {
                type: 'number',
                format: 'float',
                example: 86400,
              },
            },
          },
          last_update: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      MetricsSummary: {
        type: 'object',
        properties: {
          total_servers: {
            type: 'integer',
            example: 5,
          },
          servers_online: {
            type: 'integer',
            example: 4,
          },
          servers_offline: {
            type: 'integer',
            example: 1,
          },
          servers_degraded: {
            type: 'integer',
            example: 0,
          },
          avg_cpu: {
            type: 'number',
            format: 'float',
            example: 48.2,
          },
          avg_memory: {
            type: 'number',
            format: 'float',
            example: 61.9,
          },
          avg_disk: {
            type: 'number',
            format: 'float',
            example: 42.5,
          },
          active_alerts: {
            type: 'integer',
            example: 3,
          },
        },
      },
      MetricsHistoryPoint: {
        type: 'object',
        properties: {
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          value: {
            type: 'number',
            format: 'float',
            example: 72.4,
          },
        },
      },
      MetricsHistorySeries: {
        type: 'object',
        properties: {
          server_id: {
            type: 'string',
            example: 'srv_001',
          },
          metric_type: {
            type: 'string',
            enum: ['cpu', 'memory', 'disk', 'network'],
            example: 'cpu',
          },
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/MetricsHistoryPoint',
            },
          },
        },
      },
      MetricsSnapshot: {
        type: 'object',
        properties: {
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          servers: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ServerMetrics',
            },
          },
          summary: {
            $ref: '#/components/schemas/MetricsSummary',
          },
        },
      },
      SPIMetrics: {
        type: 'object',
        properties: {
          serviceUp: {
            type: 'number',
            format: 'float',
            example: 1,
          },
          transactionsPerSecond: {
            type: 'number',
            format: 'float',
            example: 42.7,
          },
          failedTransactionsPerSecond: {
            type: 'number',
            format: 'float',
            example: 0.3,
          },
          p95Duration: {
            type: 'number',
            format: 'float',
            example: 0.84,
            description: 'P95 transaction duration in seconds',
          },
        },
      },
      ATCMetrics: {
        type: 'object',
        properties: {
          serviceUp: {
            type: 'number',
            format: 'float',
            example: 1,
          },
          transactionsPerSecond: {
            type: 'number',
            format: 'float',
            example: 58.2,
          },
          authorizationRate: {
            type: 'number',
            format: 'float',
            example: 0.98,
          },
        },
      },
      LinkserMetrics: {
        type: 'object',
        properties: {
          serviceUp: {
            type: 'number',
            format: 'float',
            example: 1,
          },
          transactionsPerSecond: {
            type: 'number',
            format: 'float',
            example: 64.8,
          },
          authorizationRate: {
            type: 'number',
            format: 'float',
            example: 0.96,
          },
          activeDebitCards: {
            type: 'number',
            format: 'float',
            example: 210000,
          },
          activeCreditCards: {
            type: 'number',
            format: 'float',
            example: 98000,
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Servers',
      description: 'Server management and monitoring endpoints',
    },
    {
      name: 'Alerts',
      description: 'Alert management and threshold configuration',
    },
    {
      name: 'Metrics',
      description: 'Metrics collection and historical data',
    },
    {
      name: 'Reports',
      description: 'Report generation and download (ASFI compliance)',
    },
  ],
};

export const buildSwaggerSpec = (serverUrl = '/'): ReturnType<typeof swaggerJsdoc> => swaggerJsdoc({
  definition: {
    ...baseDefinition,
    servers: [
      {
        url: serverUrl,
        description: serverUrl === '/' ? 'Current server' : 'Request server',
      },
    ],
  },
  apis: apiFiles,
});

export const swaggerSpec = buildSwaggerSpec();
