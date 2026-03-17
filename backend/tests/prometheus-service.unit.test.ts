/**
 * Unit Tests - PrometheusService
 * Axios client is mocked so no real Prometheus instance is contacted.
 */

import axios from 'axios';

jest.mock('axios');
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { PrometheusService } from '../src/services/PrometheusService';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockClient = {
  get: jest.fn(),
};

function instantResponse(value: string, metric: Record<string, string> = { server: 'srv-1' }) {
  return {
    data: {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [{ metric, value: [1710000000, value] }],
      },
    },
  };
}

function rangeResponse(values: Array<[number, string]>) {
  return {
    data: {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [{ metric: {}, values }],
      },
    },
  };
}

describe('PrometheusService (unit)', () => {
  let service: PrometheusService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockClient as any);
    service = new PrometheusService();
  });

  describe('query', () => {
    it('returns Prometheus instant query data on success', async () => {
      mockClient.get.mockResolvedValue(instantResponse('42.5'));

      const result = await service.query('cpu_usage_percent');

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/query', {
        params: { query: 'cpu_usage_percent' },
      });
      expect(result.status).toBe('success');
      expect(result.data.result[0].value?.[1]).toBe('42.5');
    });

    it('includes time param when provided', async () => {
      mockClient.get.mockResolvedValue(instantResponse('11'));

      await service.query('up', 1710001234);

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/query', {
        params: { query: 'up', time: 1710001234 },
      });
    });

    it('throws wrapped error when Prometheus returns a failed status', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          status: 'error',
          error: 'bad query',
          data: { resultType: 'vector', result: [] },
        },
      });

      await expect(service.query('bad_query')).rejects.toThrow(
        'Failed to query Prometheus: Prometheus query failed: bad query'
      );
    });
  });

  describe('queryRange', () => {
    it('returns Prometheus range data on success', async () => {
      mockClient.get.mockResolvedValue(rangeResponse([[1710000000, '10'], [1710000060, '15']]));

      const result = await service.queryRange('cpu_usage_percent', 1710000000, 1710003600, '60s');

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/query_range', {
        params: {
          query: 'cpu_usage_percent',
          start: 1710000000,
          end: 1710003600,
          step: '60s',
        },
      });
      expect(result.data.result[0].values).toHaveLength(2);
    });
  });

  describe('getCurrentMetrics', () => {
    it('aggregates metrics from six Prometheus queries into per-server objects', async () => {
      mockClient.get
        .mockResolvedValueOnce(instantResponse('55', { server: 'srv-1', instance: 'inst-1' }))
        .mockResolvedValueOnce(instantResponse('70', { server: 'srv-1', instance: 'inst-1' }))
        .mockResolvedValueOnce(instantResponse('40', { server: 'srv-1', instance: 'inst-1' }))
        .mockResolvedValueOnce(instantResponse('120', { server: 'srv-1', instance: 'inst-1' }))
        .mockResolvedValueOnce(instantResponse('80', { server: 'srv-1', instance: 'inst-1' }))
        .mockResolvedValueOnce(instantResponse('1', { server: 'srv-1', instance: 'inst-1' }));

      const metrics = await service.getCurrentMetrics();

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(
        expect.objectContaining({
          serverId: 'inst-1',
          serverName: 'srv-1',
          cpu: 55,
          memory: 70,
          disk: 40,
          networkIn: 120,
          networkOut: 80,
          status: 'online',
        })
      );
    });
  });

  describe('getServerMetricsHistory', () => {
    it('returns cpu, memory and disk historical values', async () => {
      mockClient.get
        .mockResolvedValueOnce(rangeResponse([[1710000000, '10']]))
        .mockResolvedValueOnce(rangeResponse([[1710000000, '20']]))
        .mockResolvedValueOnce(rangeResponse([[1710000000, '30']]));

      const history = await service.getServerMetricsHistory('inst-1', 1710000000, 1710003600, '1m');

      expect(history).toEqual({
        serverId: 'inst-1',
        cpu: [[1710000000, '10']],
        memory: [[1710000000, '20']],
        disk: [[1710000000, '30']],
      });
    });
  });

  describe('specialized metric readers', () => {
    it('parses SPI metrics into a summary object', async () => {
      mockClient.get
        .mockResolvedValueOnce(instantResponse('1'))
        .mockResolvedValueOnce(instantResponse('120.5'))
        .mockResolvedValueOnce(instantResponse('2.5'))
        .mockResolvedValueOnce(instantResponse('0.75'));

      const result = await service.getSPIMetrics();

      expect(result).toEqual({
        serviceUp: 1,
        transactionsPerSecond: 120.5,
        failedTransactionsPerSecond: 2.5,
        p95Duration: 0.75,
      });
    });

    it('parses ATC metrics into a summary object', async () => {
      mockClient.get
        .mockResolvedValueOnce(instantResponse('1'))
        .mockResolvedValueOnce(instantResponse('88.2'))
        .mockResolvedValueOnce(instantResponse('0.97'));

      const result = await service.getATCMetrics();

      expect(result).toEqual({
        serviceUp: 1,
        transactionsPerSecond: 88.2,
        authorizationRate: 0.97,
      });
    });
  });

  describe('healthCheck', () => {
    it('returns true when Prometheus responds with 200', async () => {
      mockClient.get.mockResolvedValue({ status: 200 });

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith('/-/healthy');
    });

    it('returns false when the health endpoint fails', async () => {
      mockClient.get.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('getMetricNames', () => {
    it('returns metric names array', async () => {
      mockClient.get.mockResolvedValue({
        data: { data: ['cpu_usage_percent', 'memory_usage_percent'] },
      });

      const result = await service.getMetricNames();

      expect(result).toEqual(['cpu_usage_percent', 'memory_usage_percent']);
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/label/__name__/values');
    });
  });
});
