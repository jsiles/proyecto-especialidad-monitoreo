import { vi } from 'vitest';
import authService from './authService';
import api from './api';

const apiMock = vi.hoisted(() => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./api', () => apiMock);

describe('authService', () => {
  const mockedApi = vi.mocked(api);
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const user = {
    id: 'user-1',
    username: 'admin',
    email: 'admin@test.com',
    roles: ['ADMIN'],
    created_at: '2026-03-16T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('logs in and stores the token and user', async () => {
    mockedApi.post.mockResolvedValue({
      data: { success: true, data: { token: 'token-123', user } },
    });

    const result = await authService.login({ username: 'admin', password: 'secret' });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: 'secret',
    });
    expect(result).toEqual({ token: 'token-123', user });
    expect(localStorage.getItem('authToken')).toBe('token-123');
    expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
  });

  it('registers a user', async () => {
    mockedApi.post.mockResolvedValue({
      data: { success: true, data: { user } },
    });

    const result = await authService.register({
      username: 'admin',
      password: 'secret',
      email: 'admin@test.com',
    });

    expect(result).toEqual(user);
  });

  it('verifies the token successfully', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { valid: true } },
    });

    await expect(authService.verifyToken()).resolves.toBe(true);
  });

  it('returns false when token verification fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('Unauthorized'));

    await expect(authService.verifyToken()).resolves.toBe(false);
  });

  it('logs out and always clears storage', async () => {
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('user', JSON.stringify(user));
    mockedApi.post.mockRejectedValue(new Error('Network error'));

    await authService.logout();

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/logout');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('changes the password', async () => {
    mockedApi.post.mockResolvedValue({ data: { success: true } });

    await authService.changePassword({
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
    });
  });

  it('gets the current user', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { user } },
    });

    await expect(authService.getCurrentUser()).resolves.toEqual(user);
  });

  it('updates the current user profile and persists it', async () => {
    const updatedUser = { ...user, username: 'updated' };
    mockedApi.put.mockResolvedValue({
      data: { success: true, data: { user: updatedUser } },
    });

    await expect(
      authService.updateProfile({ username: 'updated', email: 'admin@test.com' })
    ).resolves.toEqual(updatedUser);

    expect(mockedApi.put).toHaveBeenCalledWith('/auth/me', {
      username: 'updated',
      email: 'admin@test.com',
    });
    expect(localStorage.getItem('user')).toBe(JSON.stringify(updatedUser));
  });

  it('returns the stored user when JSON is valid', () => {
    localStorage.setItem('user', JSON.stringify(user));

    expect(authService.getStoredUser()).toEqual(user);
  });

  it('returns null when stored user JSON is invalid', () => {
    localStorage.setItem('user', '{invalid-json');

    expect(authService.getStoredUser()).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('checks auth state and roles', () => {
    expect(authService.isAuthenticated()).toBe(false);

    localStorage.setItem('authToken', 'token');
    localStorage.setItem('user', JSON.stringify(user));

    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.hasRole('ADMIN')).toBe(true);
    expect(authService.hasRole('OPERATOR')).toBe(false);
    expect(authService.isAdmin()).toBe(true);
  });
});
