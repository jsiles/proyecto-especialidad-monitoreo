import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Reports } from './Reports';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetAll = vi.fn();
const mockGenerate = vi.fn();
const mockGenerateAsfi = vi.fn();
const mockDownload = vi.fn();
const serverDeps = vi.hoisted(() => ({
  servers: [{ id: 'srv-1', name: 'srv-app-01', status: 'online' }],
}));

vi.mock('date-fns', () => ({
  format: () => '2026-03-15',
}));

vi.mock('../../services/reportsService', () => ({
  reportsService: {
    getAll: () => mockGetAll(),
    generate: (...args: unknown[]) => mockGenerate(...args),
    generateAsfi: (...args: unknown[]) => mockGenerateAsfi(...args),
    downloadWithFilename: (...args: unknown[]) => mockDownload(...args),
  },
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Reports page', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    // Silence expected React act() warnings from async state updates in this page.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockResolvedValue({ reports: [] });
    serverDeps.servers = [{ id: 'srv-1', name: 'srv-app-01', status: 'online' }];
  });

  it('renders the page title', async () => {
    render(<Reports />);

    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('renders ASFI Compliance Report section', async () => {
    render(<Reports />);

    expect(screen.getByText('ASFI Compliance Report')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /generate asfi report/i })
    ).toBeInTheDocument();
  });

  it('renders generate custom report section with type buttons', async () => {
    render(<Reports />);

    expect(screen.getByText('Generate Custom Report')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /daily report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /weekly report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /monthly report/i })).toBeInTheDocument();
  });

  it('renders From Date and To Date inputs', async () => {
    render(<Reports />);

    expect(screen.getByText('From Date')).toBeInTheDocument();
    expect(screen.getByText('To Date')).toBeInTheDocument();
  });

  it('renders reports list when data is available', async () => {
    mockGetAll.mockResolvedValue({
      reports: [
        {
          id: 'r1',
          type: 'weekly',
          period_start: '2026-03-08',
          period_end: '2026-03-15',
          status: 'completed',
          generated_by: 'admin',
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText(/weekly report/i)).toBeInTheDocument();
    });
  });

  it('calls generateAsfi when button is clicked', async () => {
    const user = userEvent.setup();
    mockGenerateAsfi.mockResolvedValue({
      id: 'r-asfi',
      type: 'asfi',
      period_start: '2026-03-08',
      period_end: '2026-03-15',
      status: 'processing',
      generated_by: 'admin',
      created_at: new Date().toISOString(),
    });

    render(<Reports />);

    await user.click(screen.getByRole('button', { name: /generate asfi report/i }));

    expect(mockGenerateAsfi).toHaveBeenCalled();
  });

  it('shows server checkboxes for server selection', async () => {
    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('srv-app-01')).toBeInTheDocument();
    });
  });

  it('shows empty state when no reports exist', async () => {
    render(<Reports />);

    expect(await screen.findByText('No reports generated yet')).toBeInTheDocument();
  });

  it('refreshes reports when Refresh is clicked', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    await user.click(screen.getByRole('button', { name: /refresh/i }));

    expect(mockGetAll).toHaveBeenCalledTimes(2);
  });

  it('validates required dates before generating a custom report', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await user.clear(dateInputs[0]);
    await user.click(screen.getByRole('button', { name: /^generate report$/i }));

    expect(screen.getByText('Please select both start and end dates')).toBeInTheDocument();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('validates that start date is before end date', async () => {
    const user = userEvent.setup();
    render(<Reports />);

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await user.clear(dateInputs[0]);
    await user.type(dateInputs[0], '2026-03-20');
    await user.clear(dateInputs[1]);
    await user.type(dateInputs[1], '2026-03-10');
    await user.click(screen.getByRole('button', { name: /^generate report$/i }));

    expect(screen.getByText('Start date must be before end date')).toBeInTheDocument();
  });

  it('generates a custom report with selected servers', async () => {
    const user = userEvent.setup();
    mockGenerate.mockResolvedValue({
      id: 'r2',
      type: 'weekly',
      period_start: '2026-03-08',
      period_end: '2026-03-15',
      status: 'processing',
      generated_by: 'admin',
      created_at: new Date().toISOString(),
    });

    render(<Reports />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /^generate report$/i }));

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'weekly',
          servers: ['srv-1'],
        })
      );
    });
    expect(screen.getByText('Report generated successfully!')).toBeInTheDocument();
  });

  it('shows an error when custom report generation fails', async () => {
    const user = userEvent.setup();
    mockGenerate.mockRejectedValue(new Error('custom failed'));

    render(<Reports />);
    await user.click(screen.getByRole('button', { name: /^generate report$/i }));

    expect(await screen.findByText('Error: Error: custom failed')).toBeInTheDocument();
  });

  it('shows an error when ASFI report generation fails', async () => {
    const user = userEvent.setup();
    mockGenerateAsfi.mockRejectedValue(new Error('asfi failed'));

    render(<Reports />);
    await user.click(screen.getByRole('button', { name: /generate asfi report/i }));

    expect(await screen.findByText('Error: Error: asfi failed')).toBeInTheDocument();
  });

  it('downloads a report successfully and handles download errors', async () => {
    const user = userEvent.setup();
    mockGetAll.mockResolvedValue({
      reports: [
        {
          id: 'r1',
          type: 'weekly',
          period_start: '2026-03-08',
          period_end: '2026-03-15',
          status: 'completed',
          generated_by: 'admin',
          created_at: new Date().toISOString(),
          file_path: '/tmp/report.pdf',
        },
      ],
    });
    mockDownload.mockResolvedValueOnce(undefined);
    mockDownload.mockRejectedValueOnce(new Error('download failed'));

    render(<Reports />);
    const downloadButton = await screen.findByRole('button', { name: /download/i });

    await user.click(downloadButton);
    expect(mockDownload).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ id: 'r1' })
    );
    expect(screen.getByText('Report downloaded successfully!')).toBeInTheDocument();

    await user.click(downloadButton);
    expect(await screen.findByText('Error: Error: download failed')).toBeInTheDocument();
  });

  it('renders period and file fallbacks when report dates or file path are missing', async () => {
    mockGetAll.mockResolvedValue({
      reports: [
        {
          id: 'r3',
          type: 'daily',
          status: 'completed',
          generated_by: 'admin',
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(<Reports />);

    expect(await screen.findAllByText('N/A')).not.toHaveLength(0);
  });
});
