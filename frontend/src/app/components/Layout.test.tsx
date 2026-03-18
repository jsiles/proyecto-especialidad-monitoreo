import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { Layout } from './Layout';

const deps = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useAlerts: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: deps.useAuth,
}));

vi.mock('../../hooks/useAlerts', () => ({
  useAlerts: deps.useAlerts,
}));

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.__monitoringRealtimeConnected = false;
    deps.useAuth.mockReturnValue({
      user: { username: 'admin', email: 'admin@test.com' },
      logout: vi.fn(),
      saveProfile: vi.fn(),
    });
    deps.useAlerts.mockReturnValue({
      activeAlerts: [],
    });
  });

  const renderLayout = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

  it('shows disconnected realtime status by default and updates on websocket events', () => {
    renderLayout();

    expect(screen.getByText('Tiempo real desconectado')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('monitoring:websocket-status', {
          detail: { isConnected: true },
        })
      );
    });

    expect(screen.getByText('Tiempo real conectado')).toBeInTheDocument();
  });

  it('reads the latest persisted websocket state on mount', () => {
    window.__monitoringRealtimeConnected = true;

    renderLayout();

    expect(screen.getByText('Tiempo real conectado')).toBeInTheDocument();
  });

  it('shows a red dot on the bell only when there are pending alerts', () => {
    deps.useAlerts.mockReturnValueOnce({
      activeAlerts: [{ id: 'alert-1' }],
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('header-alert-indicator')).toBeInTheDocument();

    deps.useAlerts.mockReturnValue({
      activeAlerts: [],
    });

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('header-alert-indicator')).not.toBeInTheDocument();
  });

  it('opens a profile form from the user button', () => {
    renderLayout();

    act(() => {
      screen.getByRole('button', { name: 'Edit user profile' }).click();
    });

    expect(screen.getByText('Edit user profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('admin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('admin@test.com')).toBeInTheDocument();
  });
});
