import { render, renderHook, waitFor, act, screen } from '@testing-library/react';
import { Component, ReactNode } from 'react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const authServiceMock = vi.hoisted(() => ({
  authService: {
    getStoredUser: vi.fn(),
    isAuthenticated: vi.fn(),
    verifyToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    hasRole: vi.fn(),
    isAdmin: vi.fn(),
  },
}));

vi.mock('../services/authService', () => ({
  ...authServiceMock,
}));

describe('AuthContext', () => {
  class TestErrorBoundary extends Component<
    { children: ReactNode },
    { error: Error | null }
  > {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
      return { error };
    }

    render() {
      if (this.state.error) {
        return <div>{this.state.error.message}</div>;
      }

      return this.props.children;
    }
  }

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

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
    authServiceMock.authService.getStoredUser.mockReturnValue(null);
    authServiceMock.authService.isAuthenticated.mockReturnValue(false);
    authServiceMock.authService.verifyToken.mockResolvedValue(false);
    authServiceMock.authService.login.mockResolvedValue({ user });
    authServiceMock.authService.logout.mockResolvedValue(undefined);
    authServiceMock.authService.updateProfile.mockResolvedValue({ ...user, username: 'updated' });
    authServiceMock.authService.hasRole.mockImplementation((role: string) => role === 'ADMIN');
    authServiceMock.authService.isAdmin.mockReturnValue(true);
  });

  it('initializes with a valid stored user', async () => {
    authServiceMock.authService.getStoredUser.mockReturnValue(user);
    authServiceMock.authService.isAuthenticated.mockReturnValue(true);
    authServiceMock.authService.verifyToken.mockResolvedValue(true);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logs out invalid stored auth during initialization', async () => {
    authServiceMock.authService.getStoredUser.mockReturnValue(user);
    authServiceMock.authService.isAuthenticated.mockReturnValue(true);
    authServiceMock.authService.verifyToken.mockResolvedValue(false);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(authServiceMock.authService.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('supports login, updateUser, saveProfile, role checks and logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ username: 'admin', password: 'secret' });
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.hasRole('ADMIN')).toBe(true);
    expect(result.current.isAdmin()).toBe(true);

    act(() => {
      result.current.updateUser({ ...user, username: 'updated' });
    });

    expect(result.current.user?.username).toBe('updated');
    expect(localStorage.getItem('user')).toContain('updated');

    await act(async () => {
      await result.current.saveProfile({ username: 'updated', email: 'admin@test.com' });
    });

    expect(authServiceMock.authService.updateProfile).toHaveBeenCalledWith({
      username: 'updated',
      email: 'admin@test.com',
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const Consumer = () => {
      useAuth();
      return null;
    };

    render(
      <TestErrorBoundary>
        <Consumer />
      </TestErrorBoundary>
    );

    expect(
      screen.getByText('useAuth must be used within an AuthProvider')
    ).toBeInTheDocument();

    errorSpy.mockRestore();
  });
});
