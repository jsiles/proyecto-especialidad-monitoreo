/**
 * Unit Tests - ReportService
 * Repositories, logger and filesystem side effects are mocked/spied.
 */

jest.mock('../src/repositories/ReportRepository', () => ({
  reportRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getStatistics: jest.fn(),
  },
}));

jest.mock('../src/repositories/ServerRepository', () => ({
  serverRepository: {
    findAll: jest.fn(),
  },
}));

jest.mock('../src/repositories/AlertRepository', () => ({
  alertRepository: {
    findAll: jest.fn(),
  },
}));

jest.mock('../src/repositories/AuditLogRepository', () => ({
  auditLogRepository: {
    create: jest.fn(),
  },
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import fs from 'fs';
import { NotFoundError } from '../src/middlewares/errorHandler';
import { ReportService } from '../src/services/ReportService';
import { reportRepository } from '../src/repositories/ReportRepository';
import { auditLogRepository } from '../src/repositories/AuditLogRepository';

const mockReportRepository = reportRepository as jest.Mocked<typeof reportRepository>;
const mockAuditLogRepository = auditLogRepository as jest.Mocked<typeof auditLogRepository>;

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    type: 'daily',
    status: 'processing',
    period_start: '2026-03-01T00:00:00.000Z',
    period_end: '2026-03-02T00:00:00.000Z',
    file_path: null,
    file_size: null,
    generated_by: 'user-1',
    error_message: null,
    created_at: '2026-03-02T10:00:00.000Z',
    completed_at: null,
    ...overrides,
  };
}

function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alert-1',
    server_id: 'srv-1',
    threshold_id: null,
    server_name: 'Server 1',
    message: 'CPU high',
    severity: 'critical',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved: true,
    resolved_at: '2026-03-01T01:00:00.000Z',
    created_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ReportService (unit)', () => {
  let service: ReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    service = new ReportService();
  });

  describe('getAll', () => {
    it('returns reports and total from repository', () => {
      mockReportRepository.findAll.mockReturnValue({
        reports: [makeReport()],
        total: 1,
      } as any);

      const result = service.getAll({ type: 'daily', limit: 10, offset: 0 });

      expect(mockReportRepository.findAll).toHaveBeenCalledWith({
        type: 'daily',
        limit: 10,
        offset: 0,
      });
      expect(result.total).toBe(1);
      expect(result.reports).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('returns the report when it exists', () => {
      mockReportRepository.findById.mockReturnValue(makeReport() as any);

      const result = service.getById('report-1');

      expect(result.id).toBe('report-1');
    });

    it('throws NotFoundError when report does not exist', () => {
      mockReportRepository.findById.mockReturnValue(null as any);

      expect(() => service.getById('missing-report')).toThrow(NotFoundError);
      expect(() => service.getById('missing-report')).toThrow('Report with ID missing-report not found');
    });
  });

  describe('generate', () => {
    it('creates, completes and audits a daily report generation', async () => {
      const processingReport = makeReport();
      const completedReport = makeReport({
        status: 'completed',
        file_path: 'C:\\reports\\daily-report-1.pdf',
        file_size: 2048,
        completed_at: '2026-03-02T10:05:00.000Z',
      });

      mockReportRepository.create.mockReturnValue(processingReport as any);
      mockReportRepository.update.mockReturnValue(completedReport as any);

      const dailyReportSpy = jest
        .spyOn(service as any, 'generateDailyReport')
        .mockResolvedValue('C:\\reports\\daily-report-1.pdf');
      jest.spyOn(fs, 'statSync').mockReturnValue({ size: 2048 } as fs.Stats);

      const result = await service.generate(
        {
          type: 'daily',
          from_date: '2026-03-01T00:00:00.000Z',
          to_date: '2026-03-02T00:00:00.000Z',
        },
        'user-1'
      );

      expect(mockReportRepository.create).toHaveBeenCalledWith({
        type: 'daily',
        period_start: '2026-03-01T00:00:00.000Z',
        period_end: '2026-03-02T00:00:00.000Z',
        generated_by: 'user-1',
        status: 'processing',
      });
      expect(dailyReportSpy).toHaveBeenCalledWith(
        'report-1',
        expect.objectContaining({ type: 'daily' })
      );
      expect(mockReportRepository.update).toHaveBeenCalledWith('report-1', {
        status: 'completed',
        file_path: 'C:\\reports\\daily-report-1.pdf',
        file_size: 2048,
      });
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          action: 'REPORT_GENERATED',
          details: { reportId: 'report-1', type: 'daily' },
        })
      );
      expect(result).toEqual(completedReport);
    });

    it.each([
      ['weekly', 'generateWeeklyReport', 'C:\\reports\\weekly-report-1.pdf'],
      ['monthly', 'generateMonthlyReport', 'C:\\reports\\monthly-report-1.pdf'],
      ['custom', 'generateCustomReport', 'C:\\reports\\custom-report-1.pdf'],
      ['asfi', 'generateAsfiReport', 'C:\\reports\\asfi-report-1.pdf'],
    ] as const)(
      'uses %s generation strategy when requested',
      async (type, methodName, expectedPath) => {
        const processingReport = makeReport({ type });
        const completedReport = makeReport({
          type,
          status: 'completed',
          file_path: expectedPath,
          file_size: 512,
        });

        mockReportRepository.create.mockReturnValue(processingReport as any);
        mockReportRepository.update.mockReturnValue(completedReport as any);

        const strategySpy = jest
          .spyOn(service as any, methodName)
          .mockResolvedValue(expectedPath);
        jest.spyOn(fs, 'statSync').mockReturnValue({ size: 512 } as fs.Stats);

        const result = await service.generate(
          {
            type,
            from_date: '2026-03-01T00:00:00.000Z',
            to_date: '2026-03-31T00:00:00.000Z',
          },
          'user-1'
        );

        expect(strategySpy).toHaveBeenCalledWith(
          'report-1',
          expect.objectContaining({ type })
        );
        expect(mockReportRepository.update).toHaveBeenCalledWith('report-1', {
          status: 'completed',
          file_path: expectedPath,
          file_size: 512,
        });
        expect(result).toEqual(completedReport);
      }
    );

    it('marks the report as failed and rethrows when generation fails', async () => {
      const processingReport = makeReport({ type: 'asfi' });
      const generationError = new Error('pdf generation failed');

      mockReportRepository.create.mockReturnValue(processingReport as any);
      jest
        .spyOn(service as any, 'generateAsfiReport')
        .mockRejectedValue(generationError);

      await expect(
        service.generate(
          {
            type: 'asfi',
            from_date: '2026-03-01T00:00:00.000Z',
            to_date: '2026-03-31T00:00:00.000Z',
          },
          'user-1'
        )
      ).rejects.toThrow('pdf generation failed');

      expect(mockReportRepository.update).toHaveBeenCalledWith('report-1', {
        status: 'failed',
        error_message: 'pdf generation failed',
      });
      expect(mockAuditLogRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getFilePath', () => {
    it('returns the file path when the report file exists', () => {
      mockReportRepository.findById.mockReturnValue(
        makeReport({ status: 'completed', file_path: 'C:\\reports\\ready.pdf' }) as any
      );
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = service.getFilePath('report-1');

      expect(result).toBe('C:\\reports\\ready.pdf');
    });

    it('throws when the report has no file path', () => {
      mockReportRepository.findById.mockReturnValue(makeReport({ file_path: null }) as any);

      expect(() => service.getFilePath('report-1')).toThrow(NotFoundError);
      expect(() => service.getFilePath('report-1')).toThrow('Report file not available');
    });

    it('throws when the report file is missing on disk', () => {
      mockReportRepository.findById.mockReturnValue(
        makeReport({ file_path: 'C:\\reports\\missing.pdf' }) as any
      );
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(() => service.getFilePath('report-1')).toThrow(NotFoundError);
      expect(() => service.getFilePath('report-1')).toThrow('Report file not found on disk');
    });
  });

  describe('delete', () => {
    it('removes the file, deletes the report and writes an audit log', () => {
      mockReportRepository.findById.mockReturnValue(
        makeReport({
          type: 'monthly',
          status: 'completed',
          file_path: 'C:\\reports\\monthly.pdf',
        }) as any
      );
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);

      service.delete('report-1', 'user-2');

      expect(fs.unlinkSync).toHaveBeenCalledWith('C:\\reports\\monthly.pdf');
      expect(mockReportRepository.delete).toHaveBeenCalledWith('report-1');
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-2',
          action: 'REPORT_DELETED',
          details: { reportId: 'report-1', type: 'monthly' },
        })
      );
    });

    it('deletes and audits even when the report has no file path', () => {
      mockReportRepository.findById.mockReturnValue(
        makeReport({
          type: 'weekly',
          file_path: null,
        }) as any
      );

      service.delete('report-1', 'user-3');

      expect(mockReportRepository.delete).toHaveBeenCalledWith('report-1');
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-3',
          action: 'REPORT_DELETED',
          details: { reportId: 'report-1', type: 'weekly' },
        })
      );
    });
  });

  describe('getStatistics', () => {
    it('returns repository statistics', () => {
      const stats = {
        total: 8,
        by_type: { daily: 3, weekly: 2, monthly: 1, asfi: 2 },
        by_status: { completed: 7, failed: 1 },
        recent_count: 5,
      };
      mockReportRepository.getStatistics.mockReturnValue(stats);

      const result = service.getStatistics();

      expect(mockReportRepository.getStatistics).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('availability helpers', () => {
    const reportWindow = {
      type: 'weekly',
      from_date: '2026-03-01T00:00:00.000Z',
      to_date: '2026-03-01T10:00:00.000Z',
    };

    it('calculates availability from actual downtime duration', () => {
      const availability = (service as any).calculateServerAvailability(
        [
          makeAlert({
            created_at: '2026-03-01T01:00:00.000Z',
            resolved_at: '2026-03-01T03:00:00.000Z',
          }),
        ],
        reportWindow
      );

      expect(availability).toBeCloseTo(80, 5);
    });

    it('clips downtime to the requested report window', () => {
      const availability = (service as any).calculateServerAvailability(
        [
          makeAlert({
            created_at: '2026-02-28T23:00:00.000Z',
            resolved_at: '2026-03-01T02:00:00.000Z',
          }),
          makeAlert({
            created_at: '2026-03-01T09:00:00.000Z',
            resolved_at: null,
            resolved: false,
          }),
        ],
        reportWindow
      );

      expect(availability).toBeCloseTo(70, 5);
    });

    it('merges overlapping alert windows to avoid double-counting downtime', () => {
      const availability = (service as any).calculateServerAvailability(
        [
          makeAlert({
            created_at: '2026-03-01T01:00:00.000Z',
            resolved_at: '2026-03-01T04:00:00.000Z',
          }),
          makeAlert({
            id: 'alert-2',
            created_at: '2026-03-01T03:00:00.000Z',
            resolved_at: '2026-03-01T06:00:00.000Z',
          }),
        ],
        reportWindow
      );

      expect(availability).toBeCloseTo(50, 5);
    });

    it('ignores informational alerts when computing downtime', () => {
      const availability = (service as any).calculateServerAvailability(
        [
          makeAlert({
            severity: 'info',
            created_at: '2026-03-01T01:00:00.000Z',
            resolved_at: '2026-03-01T09:00:00.000Z',
          }),
        ],
        reportWindow
      );

      expect(availability).toBe(100);
    });
  });
});
