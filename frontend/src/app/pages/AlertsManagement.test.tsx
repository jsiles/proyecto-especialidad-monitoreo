import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AlertsManagement } from './AlertsManagement';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFetchAlerts = vi.fn();
const mockFetchThresholds = vi.fn();
const mockAcknowledgeAlert = vi.fn();
const mockResolveAlert = vi.fn();
const mockCreateThreshold = vi.fn();
const mockDeleteThreshold = vi.fn();
const alertDeps = vi.hoisted(() => ({
  alerts: [
    {
      id: 'a1',
      message: 'CPU critical on srv-app-01',
      severity: 'critical',
      server_id: 'srv-1',
      server_name: 'srv-app-01',
      created_at: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
    },
  ],
  activeAlerts: [
    {
      id: 'a1',
      message: 'CPU critical on srv-app-01',
      severity: 'critical',
      server_id: 'srv-1',
      server_name: 'srv-app-01',
      created_at: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
    },
  ],
  thresholds: [
    {
      id: 't1',
      server_id: 'srv-1',
      metric_type: 'cpu',
      threshold_value: 80,
      severity: 'warning',
      server_name: 'srv-app-01',
    },
  ],
  loading: false,
}));

const serverDeps = vi.hoisted(() => ({
  servers: [{ id: 'srv-1', name: 'srv-app-01', status: 'online' }],
}));

vi.mock('date-fns', () => ({
  format: () => '10:00:00',
}));

vi.mock('../../hooks/useAlerts', () => ({
  useAlerts: () => ({
    alerts: alertDeps.alerts,
    activeAlerts: alertDeps.activeAlerts,
    thresholds: alertDeps.thresholds,
    loading: alertDeps.loading,
    error: null,
    fetchAlerts: mockFetchAlerts,
    fetchActiveAlerts: vi.fn(),
    fetchThresholds: mockFetchThresholds,
    acknowledgeAlert: mockAcknowledgeAlert,
    resolveAlert: mockResolveAlert,
    createThreshold: mockCreateThreshold,
    deleteThreshold: mockDeleteThreshold,
  }),
}));

vi.mock('../../hooks/useServers', () => ({
  useServers: () => ({
    servers: serverDeps.servers,
    loading: false,
    error: null,
    createServer: vi.fn(),
    updateServer: vi.fn(),
    deleteServer: vi.fn(),
    refreshServers: vi.fn(),
    fetchServers: vi.fn(),
    getServer: vi.fn(),
    refreshServer: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  getErrorMessage: (err: unknown) => `Error: ${String(err)}`,
}));

beforeAll(() => {
  window.confirm = vi.fn(() => true);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AlertsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    alertDeps.alerts = [
      {
        id: 'a1',
        message: 'CPU critical on srv-app-01',
        severity: 'critical',
        server_id: 'srv-1',
        server_name: 'srv-app-01',
        created_at: new Date().toISOString(),
        acknowledged: false,
        resolved: false,
      },
    ];
    alertDeps.activeAlerts = [
      {
        id: 'a1',
        message: 'CPU critical on srv-app-01',
        severity: 'critical',
        server_id: 'srv-1',
        server_name: 'srv-app-01',
        created_at: new Date().toISOString(),
        acknowledged: false,
        resolved: false,
      },
    ];
    alertDeps.thresholds = [
      {
        id: 't1',
        server_id: 'srv-1',
        metric_type: 'cpu',
        threshold_value: 80,
        severity: 'warning',
        server_name: 'srv-app-01',
      },
    ];
    alertDeps.loading = false;
    serverDeps.servers = [{ id: 'srv-1', name: 'srv-app-01', status: 'online' }];
  });

  it('renders page title', () => {
    render(<AlertsManagement />);

    expect(screen.getByText('Alerts Management')).toBeInTheDocument();
  });

  it('shows active alerts count in tab label', () => {
    render(<AlertsManagement />);

    // Active Alerts tab should show count "1"
    expect(screen.getByText('Active Alerts (1)')).toBeInTheDocument();
  });

  it('renders active alert message in the active tab', () => {
    render(<AlertsManagement />);

    expect(screen.getByText('CPU critical on srv-app-01')).toBeInTheDocument();
    expect(screen.getByText('Server: srv-app-01')).toBeInTheDocument();
  });

  it('renders Acknowledge and Resolve buttons for active alerts', () => {
    render(<AlertsManagement />);

    expect(screen.getByRole('button', { name: /acknowledge/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
  });

  it('calls acknowledgeAlert when Acknowledge is clicked', async () => {
    const user = userEvent.setup();
    mockAcknowledgeAlert.mockResolvedValue(true);
    render(<AlertsManagement />);

    await user.click(screen.getByRole('button', { name: /acknowledge/i }));

    expect(mockAcknowledgeAlert).toHaveBeenCalledWith('a1');
  });

  it('switches to Thresholds tab', async () => {
    const user = userEvent.setup();
    render(<AlertsManagement />);

    await user.click(screen.getByRole('tab', { name: /thresholds/i }));

    // After switching to thresholds tab, should show threshold content
    expect(screen.getByText('srv-app-01')).toBeInTheDocument();
  });

  it('refreshes alerts and thresholds when Refresh is clicked', async () => {
    const user = userEvent.setup();
    render(<AlertsManagement />);

    await user.click(screen.getByRole('button', { name: /refresh/i }));

    expect(mockFetchAlerts).toHaveBeenCalled();
    expect(mockFetchThresholds).toHaveBeenCalled();
  });

  it('shows empty states for active alerts, history and thresholds', async () => {
    const user = userEvent.setup();
    alertDeps.alerts = [];
    alertDeps.activeAlerts = [];
    alertDeps.thresholds = [];

    render(<AlertsManagement />);

    expect(screen.getByText('No active alerts')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /all alerts/i }));
    expect(screen.getByText('No alerts history')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /thresholds/i }));
    expect(screen.getByText('No thresholds configured')).toBeInTheDocument();
  });

  it('shows loading states when lists are empty and loading is true', async () => {
    const user = userEvent.setup();
    alertDeps.alerts = [];
    alertDeps.activeAlerts = [];
    alertDeps.thresholds = [];
    alertDeps.loading = true;

    render(<AlertsManagement />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /all alerts/i }));
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /thresholds/i }));
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders history statuses for resolved, acknowledged and active alerts', async () => {
    const user = userEvent.setup();
    alertDeps.alerts = [
      {
        id: 'a1',
        message: 'Resolved alert',
        severity: 'critical',
        server_id: 'srv-1',
        created_at: new Date().toISOString(),
        acknowledged: true,
        resolved: true,
      },
      {
        id: 'a2',
        message: 'Acknowledged alert',
        severity: 'info',
        server_id: 'srv-2',
        created_at: new Date().toISOString(),
        acknowledged: true,
        resolved: false,
      },
      {
        id: 'a3',
        message: 'Active alert',
        severity: 'warning',
        server_id: 'srv-3',
        created_at: new Date().toISOString(),
        acknowledged: false,
        resolved: false,
      },
    ];

    render(<AlertsManagement />);
    await user.click(screen.getByRole('tab', { name: /all alerts/i }));

    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('hides Acknowledge button when alert is already acknowledged', () => {
    alertDeps.activeAlerts = [
      {
        id: 'a1',
        message: 'Already acknowledged',
        severity: 'info',
        server_id: 'srv-1',
        created_at: new Date().toISOString(),
        acknowledged: true,
        resolved: false,
      },
    ];

    render(<AlertsManagement />);

    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
  });

  it('validates server selection before creating a threshold', async () => {
    render(<AlertsManagement />);

    await userEvent.setup().click(screen.getByRole('tab', { name: /thresholds/i }));
    const submitButton = screen.getByRole('button', { name: /create threshold/i });
    const form = submitButton.closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(screen.getByText('Please select a server')).toBeInTheDocument();
    expect(mockCreateThreshold).not.toHaveBeenCalled();
  });

  it('creates a threshold successfully and refreshes thresholds', async () => {
    const user = userEvent.setup();
    mockCreateThreshold.mockResolvedValue({ id: 't2' });

    render(<AlertsManagement />);

    await user.click(screen.getByRole('tab', { name: /thresholds/i }));
    await user.selectOptions(screen.getByDisplayValue('Select server...'), 'srv-1');
    await user.click(screen.getByRole('button', { name: /create threshold/i }));

    await waitFor(() => expect(mockCreateThreshold).toHaveBeenCalled());
    expect(mockFetchThresholds).toHaveBeenCalled();
    expect(screen.getByText('Threshold created successfully!')).toBeInTheDocument();
  });

  it('shows an error message when creating a threshold fails', async () => {
    const user = userEvent.setup();
    mockCreateThreshold.mockRejectedValue(new Error('boom'));

    render(<AlertsManagement />);

    await user.click(screen.getByRole('tab', { name: /thresholds/i }));
    await user.selectOptions(screen.getByDisplayValue('Select server...'), 'srv-1');
    await user.click(screen.getByRole('button', { name: /create threshold/i }));

    expect(await screen.findByText('Error: Error: boom')).toBeInTheDocument();
  });

  it('acknowledges and resolves alerts successfully', async () => {
    const user = userEvent.setup();
    mockAcknowledgeAlert.mockResolvedValue(true);
    mockResolveAlert.mockResolvedValue(true);

    render(<AlertsManagement />);

    await user.click(screen.getByRole('button', { name: /acknowledge/i }));
    expect(mockFetchAlerts).toHaveBeenCalled();
    expect(screen.getByText('Alert acknowledged!')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /resolve/i }));
    expect(mockResolveAlert).toHaveBeenCalledWith('a1');
    expect(screen.getByText('Alert resolved!')).toBeInTheDocument();
  });

  it('shows an error when acknowledging or resolving fails', async () => {
    const user = userEvent.setup();
    mockAcknowledgeAlert.mockRejectedValue(new Error('ack failed'));
    mockResolveAlert.mockRejectedValue(new Error('resolve failed'));

    render(<AlertsManagement />);

    await user.click(screen.getByRole('button', { name: /acknowledge/i }));
    expect(await screen.findByText('Error: Error: ack failed')).toBeInTheDocument();

    mockAcknowledgeAlert.mockResolvedValue(true);
    await user.click(screen.getByRole('button', { name: /resolve/i }));
    expect(await screen.findByText('Error: Error: resolve failed')).toBeInTheDocument();
  });

  it('deletes a threshold after confirmation and handles cancel/error flows', async () => {
    const user = userEvent.setup();
    const confirmMock = vi.mocked(window.confirm);

    render(<AlertsManagement />);
    await user.click(screen.getByRole('tab', { name: /thresholds/i }));

    confirmMock.mockReturnValueOnce(false);
    await user.click(screen.getAllByRole('button').find((button) => button.className.includes('text-red-500'))!);
    expect(mockDeleteThreshold).not.toHaveBeenCalled();

    confirmMock.mockReturnValueOnce(true);
    mockDeleteThreshold.mockResolvedValueOnce(true);
    await user.click(screen.getAllByRole('button').find((button) => button.className.includes('text-red-500'))!);
    expect(mockDeleteThreshold).toHaveBeenCalledWith('t1');
    expect(screen.getByText('Threshold deleted successfully!')).toBeInTheDocument();

    confirmMock.mockReturnValueOnce(true);
    mockDeleteThreshold.mockRejectedValueOnce(new Error('delete failed'));
    await user.click(screen.getAllByRole('button').find((button) => button.className.includes('text-red-500'))!);
    expect(await screen.findByText('Error: Error: delete failed')).toBeInTheDocument();
  });
});
