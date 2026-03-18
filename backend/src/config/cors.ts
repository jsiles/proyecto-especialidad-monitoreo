import type { CorsOptions } from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const rawOrigins = process.env.CORS_ALLOWED_ORIGINS ?? process.env.CORS_ORIGIN;
const allowAnyOrigin = rawOrigins?.trim() === '*';

export function getAllowedCorsOrigins(): string[] {
  if (allowAnyOrigin) {
    return [];
  }

  const configuredOrigins = (rawOrigins ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set(configuredOrigins));
}

export function getCorsCredentialsEnabled(): boolean {
  return process.env.CORS_ALLOW_CREDENTIALS !== 'false';
}

function isOriginAllowed(origin?: string): boolean {
  if (allowAnyOrigin || !origin) {
    return true;
  }

  return getAllowedCorsOrigins().includes(origin);
}

export function createCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin ?? 'unknown'} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: getCorsCredentialsEnabled(),
  };
}

export function createSocketCorsOptions() {
  return {
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin ?? 'unknown'} is not allowed by CORS`));
    },
    methods: ['GET', 'POST'],
    credentials: getCorsCredentialsEnabled(),
  };
}
