/**
 * useMetrics Hook
 * Hook personalizado para métricas y monitoreo
 */

import { useState, useEffect, useCallback } from 'react';
import metricsService, {
  Metrics,
  MetricsSummary,
  QueryMetricsParams,
} from '../services/metricsService';
import { getErrorMessage } from '../services/api';

interface UseMetricsReturn {
  metrics: Metrics[];
  summary: MetricsSummary | null;
  loading: boolean;
  error: string | null;
  fetchMetrics: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchServerHistory: (
    serverId: string,
    params?: QueryMetricsParams
  ) => Promise<import('../services/metricsService').MetricsHistory[]>;
}

export function useMetrics(
  autoFetch = true,
  refreshInterval?: number
): UseMetricsReturn {
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await metricsService.getCurrent();
      setMetrics(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error fetching metrics:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setError(null);
    try {
      const data = await metricsService.getSummary();
      setSummary(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Error fetching summary:', message);
    }
  }, []);

  // Fetch server history
  const fetchServerHistory = useCallback(
    async (
      serverId: string,
      params?: QueryMetricsParams
    ): Promise<import('../services/metricsService').MetricsHistory[]> => {
      setError(null);
      try {
        const data = await metricsService.getServerHistory(serverId, params);
        return data;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        console.error('Error fetching server history:', message);
        return [];
      }
    },
    []
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchMetrics();
      fetchSummary();
    }
  }, [autoFetch, fetchMetrics, fetchSummary]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(() => {
      fetchMetrics();
      fetchSummary();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchMetrics, fetchSummary]);

  return {
    metrics,
    summary,
    loading,
    error,
    fetchMetrics,
    fetchSummary,
    fetchServerHistory,
  };
}

export default useMetrics;
