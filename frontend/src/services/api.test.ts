import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { api, clearAuth, getErrorMessage, hasValidToken } from './api';

type RequestHandler = {
  fulfilled?: (value: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  rejected?: (error: AxiosError) => Promise<never>;
};

type ResponseHandler = {
  fulfilled?: (value: AxiosResponse) => AxiosResponse;
  rejected?: (error: AxiosError) => Promise<never>;
};

const requestHandlers = (
  api.interceptors.request as unknown as { handlers: RequestHandler[] }
).handlers;

const responseHandlers = (
  api.interceptors.response as unknown as { handlers: ResponseHandler[] }
).handlers;

describe('api helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('returns the API error message for axios errors', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        data: {
          error: {
            message: 'Backend error',
          },
        },
      },
    } as AxiosError;

    expect(getErrorMessage(error)).toBe('Backend error');
  });

  it('falls back to axios message when backend message is absent', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed',
      response: { data: {} },
    } as AxiosError;

    expect(getErrorMessage(error)).toBe('Request failed');
  });

  it('returns the message for regular Error instances', () => {
    expect(getErrorMessage(new Error('Plain error'))).toBe('Plain error');
  });

  it('returns unknown error for unsupported values', () => {
    expect(getErrorMessage('unexpected')).toBe('Error desconocido');
  });

  it('checks whether a token exists', () => {
    expect(hasValidToken()).toBe(false);

    localStorage.setItem('authToken', 'token');

    expect(hasValidToken()).toBe(true);
  });

  it('clears authentication values', () => {
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('user', '{"id":"1"}');

    clearAuth();

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('adds the bearer token in the request interceptor', () => {
    localStorage.setItem('authToken', 'token-123');

    const config = requestHandlers[0].fulfilled?.({
      headers: {},
      method: 'get',
      url: '/servers',
    } as InternalAxiosRequestConfig);

    expect(config?.headers.Authorization).toBe('Bearer token-123');
  });

  it('logs and rejects request interceptor errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AxiosError('Request failed');

    await expect(requestHandlers[0].rejected?.(error)).rejects.toBe(error);
    expect(consoleError).toHaveBeenCalledWith('[API] Request error:', error);
  });

  it('returns the response from the response interceptor', () => {
    const response = {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} } as InternalAxiosRequestConfig,
    } as AxiosResponse;

    expect(responseHandlers[0].fulfilled?.(response)).toBe(response);
  });

  it('clears auth on 401 responses while on the login page', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/login');
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('user', '{"id":"1"}');

    const error = {
      response: {
        status: 401,
        data: { error: { message: 'Unauthorized' } },
      },
    } as AxiosError;

    await expect(responseHandlers[0].rejected?.(error)).rejects.toBe(error);
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(consoleError).toHaveBeenCalledWith('[API] Error 401:', { error: { message: 'Unauthorized' } });
  });

  it('warns on 403 and 404 responses', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const forbidden = {
      response: {
        status: 403,
        data: { error: { message: 'Forbidden' } },
      },
    } as AxiosError;

    const notFound = {
      response: {
        status: 404,
        data: { error: { message: 'Missing' } },
      },
    } as AxiosError;

    await expect(responseHandlers[0].rejected?.(forbidden)).rejects.toBe(forbidden);
    await expect(responseHandlers[0].rejected?.(notFound)).rejects.toBe(notFound);

    expect(consoleError).toHaveBeenCalledWith('[API] Error 403:', { error: { message: 'Forbidden' } });
    expect(consoleError).toHaveBeenCalledWith('[API] Error 404:', { error: { message: 'Missing' } });
    expect(consoleWarn).toHaveBeenCalledWith('[API] Access forbidden - insufficient permissions');
    expect(consoleWarn).toHaveBeenCalledWith('[API] Resource not found');
  });

  it('logs server errors for 5xx responses', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = {
      response: {
        status: 500,
        data: { error: { message: 'Boom' } },
      },
    } as AxiosError;

    await expect(responseHandlers[0].rejected?.(error)).rejects.toBe(error);

    expect(consoleError).toHaveBeenCalledWith('[API] Error 500:', { error: { message: 'Boom' } });
    expect(consoleError).toHaveBeenCalledWith('[API] Server error:', { error: { message: 'Boom' } });
  });

  it('logs network errors when no response is received', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const request = { readyState: 4 };
    const error = {
      request,
    } as AxiosError;

    await expect(responseHandlers[0].rejected?.(error)).rejects.toBe(error);
    expect(consoleError).toHaveBeenCalledWith('[API] No response received:', request);
  });

  it('logs setup errors when the request cannot be created', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AxiosError('Setup failed');

    await expect(responseHandlers[0].rejected?.(error)).rejects.toBe(error);
    expect(consoleError).toHaveBeenCalledWith('[API] Error setting up request:', 'Setup failed');
  });
});
