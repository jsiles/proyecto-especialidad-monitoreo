/**
 * useServers Hook
 * Hook personalizado para gestión de servidores
 */

import { useState, useEffect, useCallback } from 'react';
import serverService, {
  Server,
  CreateServerData,
  UpdateServerData,
} from '../services/serversService';
import { getErrorMessage } from '../services/api';

interface UseServersReturn {
  servers: Server[];
  loading: boolean;
  error: string | null;
  fetchServers: () => Promise<void>;
  getServer: (id: string) => Promise<Server | null>;
  createServer: (data: CreateServerData) => Promise<Server | null>;
  updateServer: (id: string, data: UpdateServerData) => Promise<Server | null>;
  deleteServer: (id: string) => Promise<boolean>;
  refreshServer: (id: string) => Promise<void>;
}

export function useServers(autoFetch = true): UseServersReturn {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all servers
  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await serverService.getAll();
      setServers(response.servers);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error fetching servers:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single server
  const getServer = useCallback(async (id: string): Promise<Server | null> => {
    setError(null);
    try {
      const server = await serverService.getById(id);
      return server;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error fetching server:', message);
      return null;
    }
  }, []);

  // Create server
  const createServer = useCallback(
    async (data: CreateServerData): Promise<Server | null> => {
      setError(null);
      try {
        const newServer = await serverService.create(data);
        setServers((prev) => [...prev, newServer]);
        return newServer;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        console.error('Error creating server:', message);
        return null;
      }
    },
    []
  );

  // Update server
  const updateServer = useCallback(
    async (id: string, data: UpdateServerData): Promise<Server | null> => {
      setError(null);
      try {
        const updatedServer = await serverService.update(id, data);
        setServers((prev) =>
          prev.map((s) => (s.id === id ? updatedServer : s))
        );
        return updatedServer;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        console.error('Error updating server:', message);
        return null;
      }
    },
    []
  );

  // Delete server
  const deleteServer = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await serverService.delete(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error deleting server:', message);
      return false;
    }
  }, []);

  // Refresh single server
  const refreshServer = useCallback(async (id: string): Promise<void> => {
    try {
      const server = await serverService.getById(id);
      setServers((prev) => prev.map((s) => (s.id === id ? server : s)));
    } catch (err) {
      console.error('Error refreshing server:', err);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchServers();
    }
  }, [autoFetch, fetchServers]);

  return {
    servers,
    loading,
    error,
    fetchServers,
    getServer,
    createServer,
    updateServer,
    deleteServer,
    refreshServer,
  };
}

export default useServers;
