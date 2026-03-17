import request from 'supertest';
import { app } from '../src/app';

describe('Authentication Integration', () => {
  it('logs in with valid seeded credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.username).toBe('admin');
    expect(response.body.data.user.password_hash).toBeUndefined();
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('verifies token for authenticated user', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    const token = login.body.data.token;

    const verify = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);

    expect(verify.status).toBe(200);
    expect(verify.body.success).toBe(true);
    expect(verify.body.data.valid).toBe(true);
    expect(verify.body.data.user.username).toBe('admin');
  });

  it('rejects token verification without auth header', async () => {
    const response = await request(app).get('/api/auth/verify');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
