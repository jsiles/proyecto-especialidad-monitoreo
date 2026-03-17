import request from 'supertest';
import { app } from '../src/app';

describe('Reports Integration', () => {
  const getAuthToken = async (): Promise<string> => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    return loginResponse.body.data.token;
  };

  it('requires authentication to list reports', async () => {
    const response = await request(app).get('/api/reports');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('generates and downloads an ASFI report', async () => {
    const token = await getAuthToken();

    const generateResponse = await request(app)
      .post('/api/reports/generate/asfi')
      .set('Authorization', `Bearer ${token}`)
      .send({ from: '2026-03-01', to: '2026-03-15' });

    expect(generateResponse.status).toBe(201);
    expect(generateResponse.body.success).toBe(true);
    expect(generateResponse.body.data.report.type).toBe('asfi');
    expect(generateResponse.body.data.report.status).toBe('completed');

    const reportId = generateResponse.body.data.report.id;

    const downloadResponse = await request(app)
      .get(`/api/reports/${reportId}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain('application/pdf');
    expect(Number(downloadResponse.headers['content-length'] || 0)).toBeGreaterThan(0);
  });
});
