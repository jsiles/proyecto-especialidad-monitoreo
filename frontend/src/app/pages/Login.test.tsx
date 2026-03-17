import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Login } from './Login';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockGetErrorMessage = vi.fn(() => 'Invalid credentials');

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock('../../services/api', () => ({
  getErrorMessage: (err: unknown) => mockGetErrorMessage(err),
}));

// Mock Radix UI Checkbox to avoid ResizeObserver dependency in jsdom
vi.mock('../components/ui/checkbox', () => ({
  Checkbox: () => null,
}));

describe('Login page', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form fields', () => {
    render(<Login />);

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('shows validation error when username/password are empty', async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByText('Please enter username and password')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login and navigates to dashboard on success', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);

    render(<Login />);

    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockLogin).toHaveBeenCalledWith({ username: 'admin', password: 'admin123' });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows backend error message when login fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('401'));

    render(<Login />);

    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'bad');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockGetErrorMessage).toHaveBeenCalled();
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});
