/**
 * Swagger Configuration
 * OpenAPI 3.0 Documentation
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
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
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.monitoring.example.com',
        description: 'Production server',
      },
    ],
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
              enum: ['application', 'database', 'web', 'cache', 'other'],
              example: 'application',
            },
            environment: {
              type: 'string',
              enum: ['production', 'staging', 'development'],
              example: 'production',
            },
            status: {
              type: 'string',
              enum: ['online', 'offline', 'degraded'],
              example: 'online',
            },
            created_at: {
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
        Metrics: {
          type: 'object',
          properties: {
            server_id: {
              type: 'string',
              example: 'srv_001',
            },
            cpu: {
              type: 'number',
              format: 'float',
              example: 45.5,
              description: 'CPU usage percentage',
            },
            memory: {
              type: 'number',
              format: 'float',
              example: 62.3,
              description: 'Memory usage percentage',
            },
            disk: {
              type: 'number',
              format: 'float',
              example: 55.0,
              description: 'Disk usage percentage',
            },
            networkIn: {
              type: 'number',
              format: 'float',
              example: 1024.5,
              description: 'Network bytes received',
            },
            networkOut: {
              type: 'number',
              format: 'float',
              example: 512.3,
              description: 'Network bytes sent',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
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
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
