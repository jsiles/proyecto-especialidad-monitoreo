import { vi } from 'vitest';

describe('main entrypoint', () => {
  afterEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
  });

  it('renders the app into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const render = vi.fn();
    const createRoot = vi.fn(() => ({ render }));

    vi.doMock('react-dom/client', () => ({ createRoot }));
    vi.doMock('./app/App', () => ({
      default: () => <div>App</div>,
    }));

    await import('./main');

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(render).toHaveBeenCalled();
  });

  it('throws when the root element is missing', async () => {
    vi.doMock('react-dom/client', () => ({ createRoot: vi.fn() }));
    vi.doMock('./app/App', () => ({
      default: () => <div>App</div>,
    }));

    await expect(import('./main')).rejects.toThrow('Failed to find the root element');
  });
});
