import { randomUUID } from 'crypto';
import request from 'supertest';
import { app } from '../src/app';
import { getDatabase } from '../src/database/connection';

describe('Alerts Integration', () => {
  const getAuthToken = async (): Promise<string> => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    return loginResponse.body.data.token;
  };

  const getAnyServerId = (): string => {
    const db = getDatabase();
    const row = db.prepare('SELECT id FROM servers LIMIT 1').get() as { id: string } | undefined;
    if (!row?.id) {
      throw new Error('No seeded server found for alerts tests');
    }
    return row.id;
  };

  it('requires authentication to list alerts', async () => {
    const response = await request(app).get('/api/alerts');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('creates, updates and deletes a threshold', async () => {
    const token = await getAuthToken();
    const serverId = getAnyServerId();

    const createResponse = await request(app)
      .post('/api/alerts/thresholds')
      .set('Authorization', `Bearer ${token}`)
      .send({
        server_id: serverId,
        metric_type: 'latency',
        threshold_value: 45,
        severity: 'warning',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);

    const thresholdId = createResponse.body.data.threshold.id as string;

    const updateResponse = await request(app)
      .put(`/api/alerts/thresholds/${thresholdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ threshold_value: 55 });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.threshold.threshold_value).toBe(55);

    const deleteResponse = await request(app)
      .delete(`/api/alerts/thresholds/${thresholdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);
  });

  it('acknowledges and resolves an active alert', async () => {
    const token = await getAuthToken();
    const serverId = getAnyServerId();
    const db = getDatabase();

    const alertId = randomUUID();
    db.prepare(`
      INSERT INTO alerts (
        id, server_id, threshold_id, message, severity,
        acknowledged, acknowledged_by, acknowledged_at,
        resolved, resolved_at, created_at
      ) VALUES (?, ?, NULL, ?, ?, 0, NULL, NULL, 0, NULL, ?)
    `).run(
      alertId,
      serverId,
      `Integration alert ${Date.now()}`,
      'warning',
      new Date().toISOString()
    );

    const activeResponse = await request(app)
      .get('/api/alerts/active')
      .set('Authorization', `Bearer ${token}`);

    expect(activeResponse.status).toBe(200);
    expect(activeResponse.body.success).toBe(true);
    expect(Array.isArray(activeResponse.body.data.alerts)).toBe(true);

    const acknowledgeResponse = await request(app)
      .put(`/api/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${token}`);

    expect(acknowledgeResponse.status).toBe(200);
    expect(acknowledgeResponse.body.success).toBe(true);
    expect(acknowledgeResponse.body.data.alert.acknowledged).toBe(true);
    expect(acknowledgeResponse.body.data.alert.acknowledged_by).toBe('admin');

    const resolveResponse = await request(app)
      .put(`/api/alerts/${alertId}/resolve`)
      .set('Authorization', `Bearer ${token}`);

    expect(resolveResponse.status).toBe(200);
    expect(resolveResponse.body.success).toBe(true);
    expect(resolveResponse.body.data.alert.resolved).toBe(true);
  });
});
