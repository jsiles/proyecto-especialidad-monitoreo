import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

const deps = vi.hoisted(() => ({
  RouterProvider: vi.fn(),
  Toaster: vi.fn(),
  AuthProvider: vi.fn(),
  RealtimeAlertsBridge: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    RouterProvider: (props: any) => {
      deps.RouterProvider(props);
      return <div>RouterProvider</div>;
    },
  };
});

vi.mock('sonner', () => ({
  Toaster: (props: any) => {
    deps.Toaster(props);
    return <div>Toaster</div>;
  },
}));

vi.mock('./routes', () => ({
  router: { future: {} },
}));

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => {
    deps.AuthProvider({});
    return <div>{children}</div>;
  },
}));

vi.mock('./components/RealtimeAlertsBridge', () => ({
  RealtimeAlertsBridge: () => {
    deps.RealtimeAlertsBridge({});
    return <div>RealtimeAlertsBridge</div>;
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the application shell providers and router', () => {
    render(<App />);

    expect(screen.getByText('RealtimeAlertsBridge')).toBeInTheDocument();
    expect(screen.getByText('RouterProvider')).toBeInTheDocument();
    expect(screen.getByText('Toaster')).toBeInTheDocument();
    expect(deps.RouterProvider).toHaveBeenCalledWith(
      expect.objectContaining({ router: expect.any(Object) })
    );
    expect(deps.Toaster).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-right', richColors: true })
    );
  });
});
