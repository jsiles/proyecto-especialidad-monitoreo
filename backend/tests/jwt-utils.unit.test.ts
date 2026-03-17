import {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  TokenPayload,
} from '../src/utils/jwtUtils';

describe('jwtUtils', () => {
  const payload: TokenPayload = {
    userId: 'user-1',
    username: 'admin',
    email: 'admin@test.local',
    roles: ['ADMIN'],
  };

  it('generates and verifies token', async () => {
    const token = generateToken(payload);
    const verified = await verifyToken(token);

    expect(verified.userId).toBe(payload.userId);
    expect(verified.username).toBe(payload.username);
    expect(verified.roles).toEqual(payload.roles);
  });

  it('decodes token payload', () => {
    const token = generateToken(payload);
    const decoded = decodeToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
  });

  it('returns null for invalid token decode', () => {
    const decoded = decodeToken('not-a-valid-token');
    expect(decoded).toBeNull();
  });

  it('generates refresh token', () => {
    const refreshToken = generateRefreshToken('user-1');
    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.length).toBeGreaterThan(20);
  });
});
