import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock react-router primitives so we can test behaviour without a full Router
vi.mock('react-router', () => ({
  Navigate: ({ to }: { to: string }) => (
    <div data-testid="navigate-redirect">Redirecting to: {to}</div>
  ),
  Outlet: () => <div data-testid="outlet-content">Protected Page Content</div>,
}));

const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authState(overrides: Partial<ReturnType<typeof mockUseAuth>> = {}) {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    hasRole: vi.fn(() => false),
    isAdmin: vi.fn(() => false),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  it('shows a loading spinner while authentication is being verified', () => {
    mockUseAuth.mockReturnValue(authState({ isLoading: true }));

    render(<ProtectedRoute />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate-redirect')).not.toBeInTheDocument();
    expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue(authState({ isAuthenticated: false }));

    render(<ProtectedRoute />);

    expect(screen.getByTestId('navigate-redirect')).toBeInTheDocument();
    expect(screen.getByText('Redirecting to: /login')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
  });

  it('renders Outlet (protected content) when user is authenticated', () => {
    mockUseAuth.mockReturnValue(
      authState({
        isAuthenticated: true,
        user: { id: '1', username: 'admin', email: 'admin@test.com', roles: ['ADMIN'] },
      })
    );

    render(<ProtectedRoute />);

    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate-redirect')).not.toBeInTheDocument();
  });

  it('redirects to a custom path when redirectPath prop is provided', () => {
    mockUseAuth.mockReturnValue(authState({ isAuthenticated: false }));

    render(<ProtectedRoute redirectPath="/unauthorized" />);

    expect(screen.getByText('Redirecting to: /unauthorized')).toBeInTheDocument();
  });

  it('shows Access Denied when user lacks the required role', () => {
    mockUseAuth.mockReturnValue(
      authState({
        isAuthenticated: true,
        user: { id: '1', username: 'op', email: 'op@test.com', roles: ['OPERATOR'] },
        hasRole: vi.fn(() => false),
      })
    );

    render(<ProtectedRoute requiredRole="ADMIN" />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
  });

  it('renders Outlet when user has the required role', () => {
    mockUseAuth.mockReturnValue(
      authState({
        isAuthenticated: true,
        user: { id: '1', username: 'admin', email: 'admin@test.com', roles: ['ADMIN'] },
        hasRole: vi.fn(() => true),
      })
    );

    render(<ProtectedRoute requiredRole="ADMIN" />);

    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });
});
