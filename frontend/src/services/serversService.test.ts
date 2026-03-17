import { vi } from 'vitest';
import serverService from './serversService';
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

describe('serverService', () => {
  const mockedApi = vi.mocked(api);
  const server = {
    id: 'srv-1',
    name: 'server-1',
    ip_address: '10.0.0.1',
    type: 'application',
    environment: 'production',
    status: 'online',
    created_at: '2026-03-16T00:00:00.000Z',
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets all servers', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { servers: [server], total: 1 } },
    });

    await expect(serverService.getAll({ page: 1 })).resolves.toEqual({
      servers: [server],
      total: 1,
    });
  });

  it('gets a server by id', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { server } },
    });

    await expect(serverService.getById('srv-1')).resolves.toEqual(server);
  });

  it('creates a server', async () => {
    mockedApi.post.mockResolvedValue({
      data: { success: true, data: { server } },
    });

    await expect(
      serverService.create({ name: 'server-1', ip_address: '10.0.0.1' })
    ).resolves.toEqual(server);
  });

  it('updates a server', async () => {
    mockedApi.put.mockResolvedValue({
      data: { success: true, data: { server } },
    });

    await expect(serverService.update('srv-1', { name: 'updated' })).resolves.toEqual(server);
  });

  it('deletes a server', async () => {
    mockedApi.delete.mockResolvedValue({});

    await serverService.delete('srv-1');

    expect(mockedApi.delete).toHaveBeenCalledWith('/servers/srv-1');
  });

  it('gets server status', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { status: 'online', uptime: 99, last_check: '2026-03-16T00:00:00.000Z' },
      },
    });

    await expect(serverService.getStatus('srv-1')).resolves.toEqual({
      status: 'online',
      uptime: 99,
      last_check: '2026-03-16T00:00:00.000Z',
    });
  });

  it('gets server metrics', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          cpu: 10,
          memory: 20,
          disk: 30,
          networkIn: 40,
          networkOut: 50,
          timestamp: '2026-03-16T00:00:00.000Z',
        },
      },
    });

    await expect(serverService.getMetrics('srv-1')).resolves.toEqual({
      cpu: 10,
      memory: 20,
      disk: 30,
      networkIn: 40,
      networkOut: 50,
      timestamp: '2026-03-16T00:00:00.000Z',
    });
  });
});
