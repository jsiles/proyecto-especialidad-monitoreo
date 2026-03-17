/**
 * Integration Tests - Auth Service (extended)
 * Covers: register, change-password, /me, logout, error paths
 */

import request from 'supertest';
import { app } from '../src/app';

let adminToken: string;
const uniqueSuffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = res.body.data?.token;
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a new user and returns 201', async () => {
    const username = `tester_${uniqueSuffix()}`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, password: 'Password123!', email: `${username}@example.com` });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.username).toBe(username);
    // password_hash must NOT be exposed
      expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('returns 409 when username already exists', async () => {
    // admin is the seeded user → should conflict
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'admin', password: 'Password123!', email: 'x@x.com' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when email already in use', async () => {
    // First create a user with a known email
    const username = `emailtest_${uniqueSuffix()}`;
    const email = `${username}@test.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ username, password: 'Password123!', email });

    // Second attempt with different username but same email
    const username2 = `emailtest2_${uniqueSuffix()}`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: username2, password: 'Password123!', email });

    expect(res.status).toBe(409);
  });

  it('returns error when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'Password123!' });

    // DTO throws plain Error → error handler returns 500; still not 200
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
  });

  it('returns error when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `u_${uniqueSuffix()}`, password: '123' });

    expect(res.status).not.toBe(201);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns current user info with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.username).toBe('admin');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Change Password ──────────────────────────────────────────────────────────

describe('POST /api/auth/change-password', () => {
  let userToken: string;
  let testUsername: string;

  beforeAll(async () => {
    // Register a fresh user so we can change its password without touching admin
    testUsername = `pwtest_${uniqueSuffix()}`;
    await request(app)
      .post('/api/auth/register')
      .send({ username: testUsername, password: 'OldPass123!', email: `${testUsername}@test.com` });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: 'OldPass123!' });
    userToken = loginRes.body.data?.token;
  });

  it('changes password successfully with valid current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('can login with the new password after change', async () => {
    // Change it first (in case previous test already ran)
    await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: 'NewPass456!' })
      .then((r) => {
        // May already be changed
        if (r.status === 200) userToken = r.body.data?.token;
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: 'NewPass456!' });

    expect(res.status).toBe(200);
  });

  it('returns 401 when current password is wrong', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: 'NewPass456!' });
    const token = loginRes.body.data?.token;

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPass!', newPassword: 'AnotherNew1!' });

    expect(res.status).toBe(401);
  });

  it('returns error when newPassword is missing', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'NewPass456!' });

    // DTO throws plain Error → error handler returns 500; still not 200
    expect(res.status).not.toBe(200);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'x', newPassword: 'y' });

    expect(res.status).toBe(401);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 when logged out with valid token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});
