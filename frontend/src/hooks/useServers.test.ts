import { renderHook, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import useServers from './useServers';

const serviceMock = vi.hoisted(() => ({
  serverService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const apiMock = vi.hoisted(() => ({
  getErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error'
  ),
}));

vi.mock('../services/serversService', () => ({
  default: serviceMock.serverService,
  serverService: serviceMock.serverService,
}));

vi.mock('../services/api', () => apiMock);

describe('useServers', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const server = {
    id: 'srv-1',
    name: 'server-1',
    ip_address: '10.0.0.1',
    type: 'application',
    environment: 'production',
    created_at: '2026-03-16T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    serviceMock.serverService.getAll.mockResolvedValue({ servers: [server], total: 1 });
    serviceMock.serverService.getById.mockResolvedValue(server);
    serviceMock.serverService.create.mockResolvedValue(server);
    serviceMock.serverService.update.mockResolvedValue({ ...server, name: 'updated' });
    serviceMock.serverService.delete.mockResolvedValue(undefined);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('auto-fetches servers', async () => {
    const { result } = renderHook(() => useServers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.servers).toEqual([server]);
  });

  it('supports create, update, delete, get and refresh', async () => {
    const { result } = renderHook(() => useServers());

    await waitFor(() => expect(result.current.servers).toEqual([server]));

    await act(async () => {
      await result.current.createServer({
        name: 'server-1',
        ip_address: '10.0.0.1',
      });
    });

    await act(async () => {
      await result.current.updateServer('srv-1', { name: 'updated' });
    });

    expect(result.current.servers[0].name).toBe('updated');
    await expect(result.current.getServer('srv-1')).resolves.toEqual(server);

    await act(async () => {
      await result.current.refreshServer('srv-1');
    });

    await act(async () => {
      await result.current.deleteServer('srv-1');
    });

    expect(result.current.servers).toEqual([]);
  });

  it('captures request errors', async () => {
    serviceMock.serverService.getById.mockRejectedValue(new Error('Fetch failed'));
    const { result } = renderHook(() => useServers(false));

    await expect(result.current.getServer('srv-1')).resolves.toBeNull();

    await waitFor(() => expect(result.current.error).toBe('Fetch failed'));
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('handles fetchServers errors', async () => {
    serviceMock.serverService.getAll.mockRejectedValue(new Error('List failed'));
    const { result } = renderHook(() => useServers(false));

    await act(async () => {
      await result.current.fetchServers();
    });

    expect(result.current.servers).toEqual([]);
    expect(result.current.error).toBe('List failed');
  });

  it('returns null or false when create, update and delete fail', async () => {
    const { result } = renderHook(() => useServers(false));

    serviceMock.serverService.create.mockRejectedValue(new Error('Create failed'));
    serviceMock.serverService.update.mockRejectedValue(new Error('Update failed'));
    serviceMock.serverService.delete.mockRejectedValue(new Error('Delete failed'));

    await expect(
      result.current.createServer({ name: 'server-2', ip_address: '10.0.0.2' })
    ).resolves.toBeNull();
    await waitFor(() => expect(result.current.error).toBe('Create failed'));

    await expect(
      result.current.updateServer('srv-1', { name: 'broken' })
    ).resolves.toBeNull();
    await waitFor(() => expect(result.current.error).toBe('Update failed'));

    await expect(result.current.deleteServer('srv-1')).resolves.toBe(false);
    await waitFor(() => expect(result.current.error).toBe('Delete failed'));
  });

  it('ignores refreshServer errors without mutating state', async () => {
    const { result } = renderHook(() => useServers(false));

    await act(async () => {
      await result.current.fetchServers();
    });

    serviceMock.serverService.getById.mockRejectedValue(new Error('Refresh failed'));

    await act(async () => {
      await result.current.refreshServer('srv-1');
    });

    expect(result.current.servers).toEqual([server]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error refreshing server:',
      expect.any(Error)
    );
  });
});
