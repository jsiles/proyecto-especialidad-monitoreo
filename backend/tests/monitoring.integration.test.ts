/**
 * Integration Tests - Monitoring endpoints
 * Uses jest.mock('axios') so Prometheus is never actually hit.
 * The mock is set in beforeAll and re-confirmed in beforeEach.
 * clearMocks:true (jest.config) only clears call history, not implementations.
 */

import request from 'supertest';
import axios from 'axios';
import { app } from '../src/app';
import { serverRepository } from '../src/repositories/ServerRepository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prometheusInstant(value: string) {
  return {
    data: {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [{ metric: { server: 'test' }, value: [Date.now() / 1000, value] }],
      },
    },
  };
}

function prometheusRange(values: [number, string][]) {
  return {
    data: {
      status: 'success',
      data: { resultType: 'matrix', result: [{ metric: {}, values }] },
    },
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let token: string;
let testServerId: string;

beforeAll(async () => {
  // Stub every Prometheus GET with a valid instant response
  mockedAxios.get.mockResolvedValue(prometheusInstant('50'));

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = loginRes.body.data?.token;

  // Create a reusable server directly in DB to avoid test flakiness on duplicate names
  const created = serverRepository.create({
    name: `mon-integ-test-${Date.now().toString(36)}`,
    ip_address: '10.0.2.1',
    type: 'application',
    environment: 'testing',
  });
  testServerId = created.id;
});

// Re-set the default mock before every test so tests do not bleed into each other
beforeEach(() => {
  mockedAxios.get.mockResolvedValue(prometheusInstant('50'));
});

// ─── Auth guards ──────────────────────────────────────────────────────────────

describe('Monitoring endpoints - auth guards', () => {
  it('GET /api/metrics returns 401 without token', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(401);
  });

  it('GET /api/metrics/summary returns 401 without token', async () => {
    const res = await request(app).get('/api/metrics/summary');
    expect(res.status).toBe(401);
  });

  it('GET /api/metrics/prometheus returns 401 without token', async () => {
    const res = await request(app).get('/api/metrics/prometheus');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/metrics ─────────────────────────────────────────────────────────

describe('GET /api/metrics', () => {
  it('returns 200 with servers and summary', async () => {
    const res = await request(app)
      .get('/api/metrics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('servers');
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(Array.isArray(res.body.data.servers)).toBe(true);
  });

  it('returns 200 gracefully when Prometheus is down', async () => {
    mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app)
      .get('/api/metrics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── GET /api/metrics/summary ─────────────────────────────────────────────────

describe('GET /api/metrics/summary', () => {
  it('returns summary with expected fields', async () => {
    const res = await request(app)
      .get('/api/metrics/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total_servers');
    expect(res.body.data).toHaveProperty('active_alerts');
    expect(res.body.data).toHaveProperty('avg_cpu');
    expect(res.body.data).toHaveProperty('avg_memory');
  });
});

// ─── GET /api/metrics/history ─────────────────────────────────────────────────

describe('GET /api/metrics/history', () => {
  it('returns 400 when from/to are missing', async () => {
    const res = await request(app)
      .get('/api/metrics/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns history array with valid from/to', async () => {
    const now = Date.now() / 1000;
    mockedAxios.get.mockResolvedValue(prometheusRange([[now - 3600, '30'], [now, '45']]));

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    const res = await request(app)
      .get(`/api/metrics/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&interval=5m`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('history');
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });

  it('filters by metric_type=cpu', async () => {
    mockedAxios.get.mockResolvedValue(prometheusRange([[Date.now() / 1000, '20']]));

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    const res = await request(app)
      .get(`/api/metrics/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&metric_type=cpu`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

// ─── GET /api/metrics/server/:serverId ───────────────────────────────────────

describe('GET /api/metrics/server/:serverId', () => {
  it('returns server metrics', async () => {
    mockedAxios.get.mockResolvedValue(prometheusInstant('72'));

    const res = await request(app)
      .get(`/api/metrics/server/${testServerId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('server_id', testServerId);
    expect(res.body.data).toHaveProperty('metrics');
  });

  it('returns 4xx/5xx for unknown server ID', async () => {
    const res = await request(app)
      .get('/api/metrics/server/totally-unknown-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ─── GET /api/metrics/history/:serverId ──────────────────────────────────────

describe('GET /api/metrics/history/:serverId', () => {
  it('returns 400 when from/to are missing', async () => {
    const res = await request(app)
      .get('/api/metrics/history/some-server-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns history for a specific server', async () => {
    mockedAxios.get.mockResolvedValue(prometheusRange([[Date.now() / 1000, '40']]));

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date().toISOString();

    const res = await request(app)
      .get(`/api/metrics/history/${testServerId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('serverId', testServerId);
    expect(res.body.data).toHaveProperty('history');
  });
});

// ─── GET /api/metrics/prometheus ─────────────────────────────────────────────

describe('GET /api/metrics/prometheus', () => {
  it('returns prometheus-formatted metrics data', async () => {
    const res = await request(app)
      .get('/api/metrics/prometheus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('servers');
    expect(res.body.data).toHaveProperty('raw_metrics');
  });
});
