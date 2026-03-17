import { vi } from 'vitest';
import reportsService from './reportsService';
import api from './api';

const apiMock = vi.hoisted(() => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./api', () => apiMock);

describe('reportsService', () => {
  const mockedApi = vi.mocked(api);
  const report = {
    id: 'rep-1',
    type: 'asfi',
    period_start: '2026-03-01',
    period_end: '2026-03-16',
    status: 'completed',
    generated_by: 'user-1',
    created_at: '2026-03-16T00:00:00.000Z',
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets and generates reports', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { reports: [report], total: 1, page: 1, limit: 10 } },
    });
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { report } },
    });
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: { report } },
    });
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: { report } },
    });

    await expect(reportsService.getAll()).resolves.toEqual({
      reports: [report],
      total: 1,
      page: 1,
      limit: 10,
    });
    await expect(reportsService.getById('rep-1')).resolves.toEqual(report);
    await expect(
      reportsService.generate({ type: 'asfi', from: '2026-03-01', to: '2026-03-16' })
    ).resolves.toEqual(report);
    await expect(
      reportsService.generateAsfi({ from: '2026-03-01', to: '2026-03-16' })
    ).resolves.toEqual(report);
  });

  it('downloads, deletes and gets statistics', async () => {
    const blob = new Blob(['pdf']);
    mockedApi.get.mockResolvedValueOnce({ data: blob });
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: { total: 1, by_type: { asfi: 1 }, by_status: { completed: 1 } } },
    });
    mockedApi.delete.mockResolvedValue({});

    await expect(reportsService.download('rep-1')).resolves.toBe(blob);
    await expect(reportsService.getStatistics()).resolves.toEqual({
      total: 1,
      by_type: { asfi: 1 },
      by_status: { completed: 1 },
    });

    await reportsService.delete('rep-1');

    expect(mockedApi.delete).toHaveBeenCalledWith('/reports/rep-1');
  });

  it('downloads a report with the expected filename', async () => {
    const blob = new Blob(['pdf']);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const link = document.createElement('a');
    const clickSpy = vi.spyOn(link, 'click').mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(link);
    const downloadSpy = vi.spyOn(reportsService, 'download').mockResolvedValue(blob);

    await reportsService.downloadWithFilename('rep-1', report);

    expect(downloadSpy).toHaveBeenCalledWith('rep-1');
    expect(link.download).toBe('report-asfi-rep-1.pdf');
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalledWith(link);
    expect(removeSpy).toHaveBeenCalledWith(link);
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
    createElementSpy.mockRestore();
    clickSpy.mockRestore();
    downloadSpy.mockRestore();
  });
});
