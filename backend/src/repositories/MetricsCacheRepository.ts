/**
 * Metrics Cache Repository
 * Persists metric snapshots for later inspection and history
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import {
  CreateMetricsSnapshotInput,
  MetricsCacheEntry,
  MetricsCacheMetricType,
} from '../models/MetricsCache';
import { logger } from '../utils/logger';

const METRIC_TYPES: MetricsCacheMetricType[] = [
  'cpu',
  'memory',
  'disk',
  'network_in',
  'network_out',
  'uptime',
];

export class MetricsCacheRepository {
  /**
   * Persist a complete metrics snapshot for a server.
   */
  public createSnapshot(input: CreateMetricsSnapshotInput): MetricsCacheEntry[] {
    const db = getDatabase();
    const insertMetric = db.prepare(`
      INSERT INTO metrics_cache (id, server_id, metric_type, value, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    const entries = METRIC_TYPES.map((metricType) => ({
      id: uuidv4(),
      server_id: input.server_id,
      metric_type: metricType,
      value: input.metrics[metricType] ?? 0,
      timestamp: input.timestamp,
    }));

    const transaction = db.transaction((snapshotEntries: MetricsCacheEntry[]) => {
      for (const entry of snapshotEntries) {
        insertMetric.run(
          entry.id,
          entry.server_id,
          entry.metric_type,
          entry.value,
          entry.timestamp
        );
      }
    });

    transaction(entries);

    logger.debug('Metrics snapshot persisted', {
      serverId: input.server_id,
      timestamp: input.timestamp,
      metricsStored: entries.length,
    });

    return entries;
  }
}

export const metricsCacheRepository = new MetricsCacheRepository();
export default metricsCacheRepository;
