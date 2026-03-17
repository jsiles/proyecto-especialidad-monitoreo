/**
 * useAlerts Hook
 * Hook personalizado para gestión de alertas
 */

import { useState, useEffect, useCallback } from 'react';
import alertsService, {
  Alert,
  AlertThreshold,
  CreateThresholdData,
} from '../services/alertsService';
import type { RealtimeAlertEvent } from './useWebSocket';
import { getErrorMessage } from '../services/api';

interface UseAlertsReturn {
  alerts: Alert[];
  activeAlerts: Alert[];
  thresholds: AlertThreshold[];
  loading: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  fetchActiveAlerts: () => Promise<void>;
  fetchThresholds: () => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<boolean>;
  resolveAlert: (id: string) => Promise<boolean>;
  createThreshold: (data: CreateThresholdData) => Promise<AlertThreshold | null>;
  deleteThreshold: (id: string) => Promise<boolean>;
}

export function useAlerts(
  autoFetch = true,
  refreshInterval?: number
): UseAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await alertsService.getAll();
      setAlerts(response.alerts);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error fetching alerts:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch active alerts
  const fetchActiveAlerts = useCallback(async () => {
    setError(null);
    try {
      const data = await alertsService.getActive();
      setActiveAlerts(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error fetching active alerts:', message);
    }
  }, []);

  // Fetch thresholds
  const fetchThresholds = useCallback(async () => {
    setError(null);
    try {
      const data = await alertsService.getThresholds();
      setThresholds(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error fetching thresholds:', message);
    }
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const updatedAlert = await alertsService.acknowledge(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? updatedAlert : a))
      );
      setActiveAlerts((prev) =>
        prev.map((a) => (a.id === id ? updatedAlert : a))
      );
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error acknowledging alert:', message);
      return false;
    }
  }, []);

  // Resolve alert
  const resolveAlert = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const updatedAlert = await alertsService.resolve(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? updatedAlert : a))
      );
      setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error resolving alert:', message);
      return false;
    }
  }, []);

  // Create threshold
  const createThreshold = useCallback(
    async (data: CreateThresholdData): Promise<AlertThreshold | null> => {
      setError(null);
      try {
        const newThreshold = await alertsService.createThreshold(data);
        setThresholds((prev) => [...prev, newThreshold]);
        return newThreshold;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        console.error('Error creating threshold:', message);
        return null;
      }
    },
    []
  );

  // Delete threshold
  const deleteThreshold = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await alertsService.deleteThreshold(id);
      setThresholds((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error deleting threshold:', message);
      return false;
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchAlerts();
      fetchActiveAlerts();
      fetchThresholds();
    }
  }, [autoFetch, fetchAlerts, fetchActiveAlerts, fetchThresholds]);

  // Auto-refresh interval for active alerts
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(() => {
      fetchActiveAlerts();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchActiveAlerts]);

  useEffect(() => {
    const handleAlertNew = (event: Event) => {
      const customEvent = event as CustomEvent<RealtimeAlertEvent>;
      const incoming = {
        server_id: customEvent.detail.serverId,
        server_name: customEvent.detail.serverName,
        severity: customEvent.detail.type,
        acknowledged: customEvent.detail.acknowledged,
        created_at: new Date(customEvent.detail.timestamp).toISOString(),
        id: customEvent.detail.id,
        message: customEvent.detail.message,
        resolved: false,
      } as Alert;

      setActiveAlerts((prev) => [incoming, ...prev.filter((alert) => alert.id !== incoming.id)]);
      setAlerts((prev) => [incoming, ...prev.filter((alert) => alert.id !== incoming.id)]);
    };

    const handleAlertAcknowledged = (event: Event) => {
      const customEvent = event as CustomEvent<{ alertId: string; timestamp: string | Date }>;
      setAlerts((prev) => prev.map((alert) => alert.id === customEvent.detail.alertId ? {
        ...alert,
        acknowledged: true,
        acknowledged_at: new Date(customEvent.detail.timestamp).toISOString(),
      } : alert));
      setActiveAlerts((prev) => prev.map((alert) => alert.id === customEvent.detail.alertId ? {
        ...alert,
        acknowledged: true,
        acknowledged_at: new Date(customEvent.detail.timestamp).toISOString(),
      } : alert));
    };

    const handleAlertResolved = (event: Event) => {
      const customEvent = event as CustomEvent<{ alertId: string; resolvedAt: string | Date }>;
      setAlerts((prev) => prev.map((alert) => alert.id === customEvent.detail.alertId ? {
        ...alert,
        resolved: true,
        resolved_at: new Date(customEvent.detail.resolvedAt).toISOString(),
      } : alert));
      setActiveAlerts((prev) => prev.filter((alert) => alert.id !== customEvent.detail.alertId));
    };

    window.addEventListener('monitoring:alert-new', handleAlertNew as EventListener);
    window.addEventListener('monitoring:alert-acknowledged', handleAlertAcknowledged as EventListener);
    window.addEventListener('monitoring:alert-resolved', handleAlertResolved as EventListener);

    return () => {
      window.removeEventListener('monitoring:alert-new', handleAlertNew as EventListener);
      window.removeEventListener('monitoring:alert-acknowledged', handleAlertAcknowledged as EventListener);
      window.removeEventListener('monitoring:alert-resolved', handleAlertResolved as EventListener);
    };
  }, []);

  return {
    alerts,
    activeAlerts,
    thresholds,
    loading,
    error,
    fetchAlerts,
    fetchActiveAlerts,
    fetchThresholds,
    acknowledgeAlert,
    resolveAlert,
    createThreshold,
    deleteThreshold,
  };
}

export default useAlerts;
