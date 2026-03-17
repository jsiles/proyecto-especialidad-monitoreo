import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Dashboard } from './Dashboard';

const metrics = [
  {
    server_id: 'srv-1',
    timestamp: '2026-03-16T00:00:00.000Z',
    cpu: 45,
    memory: 62,
    disk: 55,
  },
];

const summary = {
  total_servers: 3,
  servers_online: 2,
  servers_offline: 1,
  average_cpu: 45,
  average_memory: 62,
};

const activeAlerts = [
  {
    id: 'a1',
    message: 'CPU high on srv-1',
    severity: 'warning',
    created_at: '2026-03-16T00:00:00.000Z',
  },
];

const servers = [
  {
    id: 'srv-1',
    name: 'srv-app-01',
    status: 'online',
    ip_address: '10.0.0.10',
    type: 'application',
  },
  {
    id: 'srv-spi',
    name: 'spi-gateway',
    status: 'online',
    ip_address: '10.0.0.100',
    type: 'spi',
  },
  {
    id: 'srv-atc',
    name: 'atc-gateway',
    status: 'online',
    ip_address: '10.0.0.101',
    type: 'atc',
  },
];

const { fetchMetrics, getSPIMetrics, getATCMetrics } = vi.hoisted(() => ({
  fetchMetrics: vi.fn(),
  getSPIMetrics: vi.fn(),
  getATCMetrics: vi.fn(),
}));

// Mock date-fns to avoid heavy module loading
vi.mock('date-fns', () => ({
  format: () => '12:00',
}));

// Mock lucide-react icons (individual named exports)
vi.mock('lucide-react', () => ({
  Server: () => null,
  Activity: () => null,
  HardDrive: () => null,
  Clock: () => null,
  AlertCircle: () => null,
  RefreshCw: () => null,
}));

// Use plain function objects (no JSX) so the mock factory doesn't require React at hoist time
vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => children ?? null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => children ?? null,
  Legend: () => null,
}));

vi.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    metrics,
    summary,
    loading: false,
    fetchMetrics,
  }),
}));

vi.mock('../../hooks/useAlerts', () => ({
  useAlerts: () => ({
    activeAlerts,
    loading: false,
  }),
}));

vi.mock('../../hooks/useServers', () => ({
  useServers: () => ({
    servers,
    loading: false,
  }),
}));

vi.mock('../../services/metricsService', () => ({
  default: {
    getSPIMetrics,
    getATCMetrics,
  },
}));

describe('Dashboard page', () => {
  beforeEach(() => {
    getSPIMetrics.mockResolvedValue({
      serviceUp: 1,
      transactionsPerSecond: 12.34,
      failedTransactionsPerSecond: 0.12,
      p95Duration: 0.98,
    });
    getATCMetrics.mockResolvedValue({
      serviceUp: 1,
      transactionsPerSecond: 21.43,
      authorizationRate: 0.97,
    });
  });

  it('renders summary cards from hook data', () => {
    render(<Dashboard />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Servers')).toBeInTheDocument();
    expect(screen.getByText('CPU Average')).toBeInTheDocument();
    expect(screen.getByText('Memory Average')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders active alerts section with alert message', () => {
    render(<Dashboard />);

    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    expect(screen.getByText('CPU high on srv-1')).toBeInTheDocument();
  });

  it('renders grafana embed section', () => {
    render(<Dashboard />);

    expect(screen.getByText('Grafana Dashboard')).toBeInTheDocument();
    expect(screen.getByTitle('Grafana Monitoring Dashboard')).toHaveAttribute('src', expect.stringContaining('/grafana/d/main-monitoring'));
    expect(screen.getByRole('link', { name: 'Open Grafana' })).toHaveAttribute('href', '/grafana/');
  });

  it('renders SPI and ATC sections', async () => {
    render(<Dashboard />);

    expect(await screen.findByText('SPI Metrics')).toBeInTheDocument();
    expect(await screen.findByText('ATC Metrics')).toBeInTheDocument();
    expect(await screen.findAllByText('UP')).toHaveLength(2);
    expect(await screen.findByText('12.34')).toBeInTheDocument();
    expect(await screen.findByText('21.43')).toBeInTheDocument();
  });

  it('renders SPI and ATC gateway stats in monitored servers', async () => {
    render(<Dashboard />);

    expect(await screen.findByText('spi-gateway')).toBeInTheDocument();
    expect(await screen.findByText('atc-gateway')).toBeInTheDocument();
    expect(await screen.findAllByText('TPS')).toHaveLength(3);
    expect(await screen.findByText('Failed/s')).toBeInTheDocument();
    expect(await screen.findByText('Auth')).toBeInTheDocument();
  });
});
