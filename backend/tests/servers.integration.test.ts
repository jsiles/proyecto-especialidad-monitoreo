import request from 'supertest';
import { app } from '../src/app';

describe('Servers Integration', () => {
  const getAuthToken = async (): Promise<string> => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    return loginResponse.body.data.token;
  };

  it('requires authentication to list servers', async () => {
    const response = await request(app).get('/api/servers');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('creates, updates, fetches and deletes a server', async () => {
    const token = await getAuthToken();
    const serverName = `srv-test-${Date.now()}`;

    const createResponse = await request(app)
      .post('/api/servers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: serverName,
        ip_address: '10.10.10.10',
        type: 'application',
        environment: 'testing',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.server.name).toBe(serverName);

    const serverId = createResponse.body.data.server.id as string;

    const updateResponse = await request(app)
      .put(`/api/servers/${serverId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ environment: 'staging', status: 'online' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.server.environment).toBe('staging');
    expect(updateResponse.body.data.server.status).toBe('online');

    const getResponse = await request(app)
      .get(`/api/servers/${serverId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.server.id).toBe(serverId);

    const deleteResponse = await request(app)
      .delete(`/api/servers/${serverId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);

    const getAfterDelete = await request(app)
      .get(`/api/servers/${serverId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getAfterDelete.status).toBe(404);
    expect(getAfterDelete.body.success).toBe(false);
  });
});
