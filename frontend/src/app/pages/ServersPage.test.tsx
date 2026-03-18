import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ServersPage } from './ServersPage';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCreateServer = vi.fn();
const mockUpdateServer = vi.fn();
const mockDeleteServer = vi.fn();
const mockRefreshServers = vi.fn();

vi.mock('../../hooks/useServers', () => ({
  useServers: () => ({
    servers: [
      {
        id: 'srv-1',
        name: 'srv-app-01',
        ip_address: '192.168.1.10',
        type: 'application',
        environment: 'production',
        status: 'online',
      },
    ],
    loading: false,
    error: null,
    createServer: mockCreateServer,
    updateServer: mockUpdateServer,
    deleteServer: mockDeleteServer,
    refreshServers: mockRefreshServers,
    fetchServers: vi.fn(),
    getServer: vi.fn(),
    refreshServer: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  getErrorMessage: (err: unknown) => `Error: ${String(err)}`,
}));

// confirm dialog mock
beforeAll(() => {
  window.confirm = vi.fn(() => true);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ServersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and server list', () => {
    render(<ServersPage />);

    expect(screen.getByText('Servers Management')).toBeInTheDocument();
    expect(screen.getByText('srv-app-01')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
  });

  it('shows "Add New Server" form when Add Server button is clicked', async () => {
    const user = userEvent.setup();
    render(<ServersPage />);

    await user.click(screen.getByRole('button', { name: /add server/i }));

    expect(screen.getByText('Add New Server')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., srv-app-01')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 192.168.1.100')).toBeInTheDocument();
  });

  it('closes the form when the X button is clicked', async () => {
    const user = userEvent.setup();
    render(<ServersPage />);

    await user.click(screen.getByRole('button', { name: /add server/i }));
    expect(screen.getByText('Add New Server')).toBeInTheDocument();

    // The X close button is the first button with SVG inside the modal header
    const allButtons = screen.getAllByRole('button');
    const closeBtn = allButtons.find((btn) =>
      btn.className.includes('text-gray-400')
    );
    if (closeBtn) await user.click(closeBtn);

    expect(screen.queryByText('Add New Server')).not.toBeInTheDocument();
  });

  it('shows edit form pre-filled when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ServersPage />);

    // Edit button is icon-only; select by blue action class.
    const editBtn = document.querySelector('button.text-blue-600') as HTMLButtonElement;
    expect(editBtn).toBeTruthy();
    await user.click(editBtn);

    // Form should be open with "Edit Server" title
    expect(screen.getByText('Edit Server')).toBeInTheDocument();
    // Name field should be pre-filled
    expect(screen.getByDisplayValue('srv-app-01')).toBeInTheDocument();
  });

  it('calls createServer when form is filled and submitted', async () => {
    mockCreateServer.mockResolvedValue({ id: 'new-1', name: 'new-server' });
    render(<ServersPage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /add server/i }));

    const nameInput = screen.getByPlaceholderText('e.g., srv-app-01') as HTMLInputElement;
    const ipInput = screen.getByPlaceholderText('e.g., 192.168.1.100') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'new-server' } });
    fireEvent.change(ipInput, { target: { value: '10.0.0.5' } });

    const submitBtn = screen.getByRole('button', { name: /create server/i }) as HTMLButtonElement;
    const form = submitBtn.closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateServer).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'new-server', ip_address: '10.0.0.5' })
      );
    });
  });

  it('calls deleteServer when delete is confirmed', async () => {
    const user = userEvent.setup();
    mockDeleteServer.mockResolvedValue(true);
    render(<ServersPage />);

    // Delete button is icon-only; select by red action class.
    const deleteBtn = document.querySelector('button.text-red-600') as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteServer).toHaveBeenCalledWith('srv-1');
      expect(mockRefreshServers).toHaveBeenCalled();
    });
  });

  it('shows an error when deleteServer returns false', async () => {
    const user = userEvent.setup();
    mockDeleteServer.mockResolvedValue(false);
    render(<ServersPage />);

    const deleteBtn = document.querySelector('button.text-red-600') as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();
    await user.click(deleteBtn);

    expect(await screen.findByText('Server could not be deleted')).toBeInTheDocument();
  });
});
