import { router } from './routes';

vi.mock('./pages/Login', () => ({
  Login: () => null,
}));

vi.mock('./pages/Dashboard', () => ({
  Dashboard: () => null,
}));

vi.mock('./pages/AlertsManagement', () => ({
  AlertsManagement: () => null,
}));

vi.mock('./pages/Reports', () => ({
  Reports: () => null,
}));

vi.mock('./pages/ServersPage', () => ({
  ServersPage: () => null,
}));

vi.mock('./components/Layout', () => ({
  Layout: () => null,
}));

vi.mock('./components/ProtectedRoute', () => ({
  ProtectedRoute: () => null,
}));

describe('app routes', () => {
  it('defines login and protected app routes', () => {
    expect(router.routes).toHaveLength(2);
    expect(router.routes[0]).toEqual(
      expect.objectContaining({
        path: '/login',
      })
    );
    expect(router.routes[1]).toEqual(
      expect.objectContaining({
        path: '/',
      })
    );
  });

  it('defines nested dashboard, servers, alerts and reports routes', () => {
    const protectedRoot = router.routes[1];
    const layoutRoute = protectedRoot.children?.[0];

    expect(layoutRoute).toBeDefined();
    expect(layoutRoute?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ index: true }),
        expect.objectContaining({ path: 'servers' }),
        expect.objectContaining({ path: 'alerts' }),
        expect.objectContaining({ path: 'reports' }),
      ])
    );
  });
});
