import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { Layout } from './Layout';

const deps = vi.hoisted(() => ({
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    Link: ({ children, to, onClick, className }: any) => (
      <a href={to} onClick={onClick} className={className}>
        {children}
      </a>
    ),
    Outlet: () => <div>Outlet content</div>,
    useLocation: deps.useLocation,
    useNavigate: deps.useNavigate,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: deps.useAuth,
}));

describe('Layout', () => {
  const navigate = vi.fn();
  const logout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    deps.useLocation.mockReturnValue({ pathname: '/' });
    deps.useNavigate.mockReturnValue(navigate);
    deps.useAuth.mockReturnValue({ logout });
    logout.mockResolvedValue(undefined);
  });

  it('renders navigation and outlet content', () => {
    render(<Layout />);

    expect(screen.getByText('Server Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Outlet content')).toBeInTheDocument();
  });

  it('logs out and navigates to login', async () => {
    render(<Layout />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]);

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('toggles the mobile menu and closes it after selecting an item', () => {
    render(<Layout />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[4]);

    const mobileServersLinks = screen.getAllByText('Servers');
    expect(mobileServersLinks.length).toBeGreaterThan(1);

    fireEvent.click(mobileServersLinks[1]);

    expect(screen.getAllByText('Servers')).toHaveLength(1);
  });
});
