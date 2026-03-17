/**
 * Integration Tests - Reports (extended types)
 * Covers: daily, weekly, monthly, custom, getById, statistics, validation errors
 */

import request from 'supertest';
import { app } from '../src/app';

let token: string;

const dateRange = () => {
  const to = new Date().toISOString();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
};

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = res.body.data?.token;
});

// ─── Validation errors ────────────────────────────────────────────────────────

describe('POST /api/reports/generate - validation', () => {
  it('returns 400 when type is missing', async () => {
    const { from, to } = dateRange();
    const res = await request(app)
      .post('/api/reports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ from, to });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when from/to dates are missing', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid report type', async () => {
    const { from, to } = dateRange();
    const res = await request(app)
      .post('/api/reports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'invalid_type', from, to });

    expect(res.status).toBe(400);
  });
});

// ─── Report types ─────────────────────────────────────────────────────────────

describe('POST /api/reports/generate - report types', () => {
  for (const type of ['daily', 'weekly', 'monthly', 'custom']) {
    it(`generates a ${type} report and returns completed status`, async () => {
      const { from, to } = dateRange();

      const res = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ type, from, to, include_incidents: true });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.report).toHaveProperty('id');
      expect(res.body.data.report.type).toBe(type);
      expect(res.body.data.report.status).toBe('completed');
    }, 30000);
  }
});

// ─── GET /api/reports/:id ─────────────────────────────────────────────────────

describe('GET /api/reports/:id', () => {
  let reportId: string;

  beforeAll(async () => {
    const { from, to } = dateRange();
    const res = await request(app)
      .post('/api/reports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', from, to });
    reportId = res.body.data?.report?.id;
  });

  it('returns the report when it exists', async () => {
    const res = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.report.id).toBe(reportId);
  });

  it('returns 404 for non-existent report', async () => {
    const res = await request(app)
      .get('/api/reports/totally-unknown-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/reports (pagination & filters) ─────────────────────────────────

describe('GET /api/reports - filters', () => {
  it('returns reports list', async () => {
    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.reports)).toBe(true);
    expect(res.body.data).toHaveProperty('total');
  });

  it('filters reports by type=daily', async () => {
    const res = await request(app)
      .get('/api/reports?type=daily')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    if (res.body.data.reports.length > 0) {
      expect(res.body.data.reports.every((r: any) => r.type === 'daily')).toBe(true);
    }
  });

  it('filters reports by status=completed', async () => {
    const res = await request(app)
      .get('/api/reports?status=completed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('paginates with page and limit params', async () => {
    const res = await request(app)
      .get('/api/reports?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(2);
  });
});

// ─── GET /api/reports/statistics ─────────────────────────────────────────────

describe('GET /api/reports/statistics', () => {
  it('returns statistics object', async () => {
    const res = await request(app)
      .get('/api/reports/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
  });
});

// ─── File download ────────────────────────────────────────────────────────────

describe('GET /api/reports/:id/download', () => {
  let completedReportId: string;

  beforeAll(async () => {
    const { from, to } = dateRange();
    const res = await request(app)
      .post('/api/reports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'daily', from, to });
    completedReportId = res.body.data?.report?.id;
  });

  it('streams PDF for a completed report', async () => {
    const res = await request(app)
      .get(`/api/reports/${completedReportId}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
    expect(res.body).toBeTruthy();
  }, 20000);
});
