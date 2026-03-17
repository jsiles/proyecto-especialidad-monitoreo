/**
 * Unit Tests - AlertController & ReportController
 * All service and DTO validator dependencies mocked.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/services/AlertService', () => ({
  alertService: {
    getAlerts: jest.fn(),
    getActiveAlerts: jest.fn(),
    getAlertById: jest.fn(),
    acknowledgeAlert: jest.fn(),
    resolveAlert: jest.fn(),
    getAlertStatistics: jest.fn(),
    getThresholds: jest.fn(),
    createThreshold: jest.fn(),
    updateThreshold: jest.fn(),
    deleteThreshold: jest.fn(),
  },
}));

jest.mock('../src/dtos/AlertDTO', () => ({
  validateCreateThresholdDTO: jest.fn((body) => body),
  validateUpdateThresholdDTO: jest.fn((body) => body),
}));

jest.mock('../src/services/ReportService', () => ({
  reportService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    generate: jest.fn(),
    getFilePath: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  auditLog: jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { AlertController } from '../src/controllers/AlertController';
import { ReportController } from '../src/controllers/ReportController';
import { alertService } from '../src/services/AlertService';
import { reportService } from '../src/services/ReportService';
import { validateCreateThresholdDTO, validateUpdateThresholdDTO } from '../src/dtos/AlertDTO';

const mockAlert = alertService as jest.Mocked<typeof alertService>;
const mockReport = reportService as jest.Mocked<typeof reportService>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMocks(reqOverrides: any = {}) {
  const res: any = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    sendFile: jest.fn(),
  };
  const req: any = {
    body: {},
    params: {},
    query: {},
    ip: '127.0.0.1',
    user: { userId: 'user-1', username: 'admin', roles: ['ADMIN'] },
    ...reqOverrides,
  };
  const next = jest.fn();
  return { req, res, next };
}

function makeAlertDTO(overrides: any = {}) {
  return {
    id: 'alert-1',
    server_id: 'srv-1',
    server_name: 'Web',
    message: 'CPU high',
    severity: 'warning',
    acknowledged: false,
    resolved: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeThresholdDTO(overrides: any = {}) {
  return {
    id: 'thresh-1',
    server_id: 'srv-1',
    metric_type: 'cpu',
    threshold_value: 80,
    severity: 'warning',
    enabled: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeReportDTO(overrides: any = {}) {
  return {
    id: 'rep-1',
    type: 'daily',
    status: 'completed',
    from_date: '2026-01-01',
    to_date: '2026-01-07',
    file_path: '/data/reports/rep-1.pdf',
    file_size: 1024,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── AlertController ──────────────────────────────────────────────────────────

describe('AlertController (unit)', () => {
  let ctrl: AlertController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new AlertController();
  });

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns alerts with total', async () => {
      const { req, res, next } = makeMocks();
      mockAlert.getAlerts.mockReturnValue({ alerts: [makeAlertDTO()], total: 1 });

      await ctrl.getAll(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ total: 1 }) })
      );
    });

    it('parses boolean query params correctly', async () => {
      const { req, res, next } = makeMocks({
        query: { acknowledged: 'true', resolved: 'false', limit: '10', offset: '5' },
      });
      mockAlert.getAlerts.mockReturnValue({ alerts: [], total: 0 });

      await ctrl.getAll(req, res, next);

      expect(mockAlert.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ acknowledged: true, resolved: false, limit: 10, offset: 5 })
      );
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks();
      mockAlert.getAlerts.mockImplementationOnce(() => { throw new Error('db error'); });

      await ctrl.getAll(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getActive ────────────────────────────────────────────────────────────

  describe('getActive', () => {
    it('returns active alerts', async () => {
      const { req, res, next } = makeMocks();
      mockAlert.getActiveAlerts.mockReturnValue([makeAlertDTO()]);

      await ctrl.getActive(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ total: 1 }) })
      );
    });

    it('passes severity filter', async () => {
      const { req, res, next } = makeMocks({ query: { severity: 'critical' } });
      mockAlert.getActiveAlerts.mockReturnValue([]);

      await ctrl.getActive(req, res, next);

      expect(mockAlert.getActiveAlerts).toHaveBeenCalledWith('critical');
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks();
      mockAlert.getActiveAlerts.mockImplementationOnce(() => { throw new Error('fail'); });

      await ctrl.getActive(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns alert by id', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'alert-1' } });
      mockAlert.getAlertById.mockReturnValue(makeAlertDTO());

      await ctrl.getById(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { alert: expect.objectContaining({ id: 'alert-1' }) } })
      );
    });

    it('calls next when alert not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' } });
      mockAlert.getAlertById.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.getById(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── acknowledge ──────────────────────────────────────────────────────────

  describe('acknowledge', () => {
    it('acknowledges alert and returns it', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'alert-1' } });
      mockAlert.acknowledgeAlert.mockReturnValue(makeAlertDTO({ acknowledged: true }));

      await ctrl.acknowledge(req, res, next);

      expect(mockAlert.acknowledgeAlert).toHaveBeenCalledWith('alert-1', 'user-1', 'admin');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'alert-1' } });
      mockAlert.acknowledgeAlert.mockImplementationOnce(() => { throw new Error('already acknowledged'); });

      await ctrl.acknowledge(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── resolve ──────────────────────────────────────────────────────────────

  describe('resolve', () => {
    it('resolves alert and returns it', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'alert-1' } });
      mockAlert.resolveAlert.mockReturnValue(makeAlertDTO({ resolved: true }));

      await ctrl.resolve(req, res, next);

      expect(mockAlert.resolveAlert).toHaveBeenCalledWith('alert-1', 'user-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('passes undefined userId when no user in request', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'alert-1' }, user: undefined });
      mockAlert.resolveAlert.mockReturnValue(makeAlertDTO({ resolved: true }));

      await ctrl.resolve(req, res, next);

      expect(mockAlert.resolveAlert).toHaveBeenCalledWith('alert-1', undefined);
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'alert-1' } });
      mockAlert.resolveAlert.mockImplementationOnce(() => { throw new Error('already resolved'); });

      await ctrl.resolve(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getStatistics ────────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns statistics', async () => {
      const { req, res, next } = makeMocks({ query: { from_date: '2026-01-01', to_date: '2026-01-31' } });
      mockAlert.getAlertStatistics.mockReturnValue({ total: 10, critical: 3 } as any);

      await ctrl.getStatistics(req, res, next);

      expect(mockAlert.getAlertStatistics).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next on error', async () => {
      const { req, res, next } = makeMocks();
      mockAlert.getAlertStatistics.mockImplementationOnce(() => { throw new Error('fail'); });

      await ctrl.getStatistics(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getThresholds ────────────────────────────────────────────────────────

  describe('getThresholds', () => {
    it('returns thresholds', async () => {
      const { req, res, next } = makeMocks();
      mockAlert.getThresholds.mockReturnValue([makeThresholdDTO()]);

      await ctrl.getThresholds(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { thresholds: expect.any(Array) } })
      );
    });

    it('passes server_id filter', async () => {
      const { req, res, next } = makeMocks({ query: { server_id: 'srv-1' } });
      mockAlert.getThresholds.mockReturnValue([]);

      await ctrl.getThresholds(req, res, next);

      expect(mockAlert.getThresholds).toHaveBeenCalledWith('srv-1');
    });
  });

  // ─── createThreshold ──────────────────────────────────────────────────────

  describe('createThreshold', () => {
    it('returns 201 with created threshold', async () => {
      const { req, res, next } = makeMocks({ body: { server_id: 'srv-1', metric_type: 'cpu' } });
      mockAlert.createThreshold.mockReturnValue(makeThresholdDTO());

      await ctrl.createThreshold(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when DTO validation throws', async () => {
      const { req, res, next } = makeMocks({ body: {} });
      (validateCreateThresholdDTO as jest.Mock).mockImplementationOnce(() => { throw new Error('bad'); });

      await ctrl.createThreshold(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when service throws', async () => {
      const { req, res, next } = makeMocks({ body: { server_id: 'gone', metric_type: 'cpu' } });
      mockAlert.createThreshold.mockImplementationOnce(() => { throw new Error('already exists'); });

      await ctrl.createThreshold(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── updateThreshold ──────────────────────────────────────────────────────

  describe('updateThreshold', () => {
    it('returns updated threshold', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'thresh-1' }, body: { threshold_value: 90 } });
      mockAlert.updateThreshold.mockReturnValue(makeThresholdDTO({ threshold_value: 90 }));

      await ctrl.updateThreshold(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when DTO validation throws', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'thresh-1' }, body: {} });
      (validateUpdateThresholdDTO as jest.Mock).mockImplementationOnce(() => { throw new Error('bad'); });

      await ctrl.updateThreshold(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when threshold not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' }, body: { threshold_value: 90 } });
      mockAlert.updateThreshold.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.updateThreshold(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── deleteThreshold ──────────────────────────────────────────────────────

  describe('deleteThreshold', () => {
    it('returns success message', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'thresh-1' } });

      await ctrl.deleteThreshold(req, res, next);

      expect(mockAlert.deleteThreshold).toHaveBeenCalledWith('thresh-1', 'user-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when threshold not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' } });
      mockAlert.deleteThreshold.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.deleteThreshold(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

// ─── ReportController ─────────────────────────────────────────────────────────

describe('ReportController (unit)', () => {
  let ctrl: ReportController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new ReportController();
  });

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns paginated reports', async () => {
      const { req, res, next } = makeMocks({ query: { page: '2', limit: '10' } });
      mockReport.getAll.mockReturnValue({ reports: [makeReportDTO()], total: 11 });

      await ctrl.getAll(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ total: 11, page: 2, limit: 10 }),
        })
      );
    });

    it('defaults to page 1 when not specified', async () => {
      const { req, res, next } = makeMocks();
      mockReport.getAll.mockReturnValue({ reports: [], total: 0 });

      await ctrl.getAll(req, res, next);

      const callArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArg.data.page).toBe(1);
    });

    it('calls next on service error', async () => {
      const { req, res, next } = makeMocks();
      mockReport.getAll.mockImplementationOnce(() => { throw new Error('fail'); });

      await ctrl.getAll(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns report by id', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'rep-1' } });
      mockReport.getById.mockReturnValue(makeReportDTO());

      await ctrl.getById(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { report: expect.objectContaining({ id: 'rep-1' }) } })
      );
    });

    it('calls next when report not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' } });
      mockReport.getById.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.getById(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── generate ─────────────────────────────────────────────────────────────

  describe('generate', () => {
    it('returns 201 with generated report', async () => {
      const { req, res, next } = makeMocks({
        body: { type: 'daily', from: '2026-01-01', to: '2026-01-01' },
      });
      mockReport.generate.mockResolvedValue(makeReportDTO());

      await ctrl.generate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when type is missing', async () => {
      const { req, res, next } = makeMocks({ body: { from: '2026-01-01', to: '2026-01-07' } });

      await ctrl.generate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when date range is missing', async () => {
      const { req, res, next } = makeMocks({ body: { type: 'daily' } });

      await ctrl.generate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when type is invalid', async () => {
      const { req, res, next } = makeMocks({
        body: { type: 'unknown', from: '2026-01-01', to: '2026-01-07' },
      });

      await ctrl.generate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('calls next when service throws', async () => {
      const { req, res, next } = makeMocks({
        body: { type: 'asfi', from: '2026-01-01', to: '2026-01-31' },
      });
      mockReport.generate.mockRejectedValue(new Error('pdf error'));

      await ctrl.generate(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── generateAsfi ─────────────────────────────────────────────────────────

  describe('generateAsfi', () => {
    it('returns 201 with asfi report', async () => {
      const { req, res, next } = makeMocks({ body: { from: '2026-01-01', to: '2026-01-31' } });
      mockReport.generate.mockResolvedValue(makeReportDTO({ type: 'asfi' }));

      await ctrl.generateAsfi(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockReport.generate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'asfi', include_charts: true }),
        'user-1'
      );
    });

    it('calls next when date range is missing', async () => {
      const { req, res, next } = makeMocks({ body: {} });

      await ctrl.generateAsfi(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── download ─────────────────────────────────────────────────────────────

  describe('download', () => {
    it('sends the pdf file', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'rep-1' } });
      mockReport.getFilePath.mockReturnValue('data/reports/rep-1.pdf');
      mockReport.getById.mockReturnValue(makeReportDTO({ file_size: 2048 }));

      await ctrl.download(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.sendFile).toHaveBeenCalled();
    });

    it('calls next when report not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' } });
      mockReport.getFilePath.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.download(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('returns success message', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'rep-1' } });

      await ctrl.delete(req, res, next);

      expect(mockReport.delete).toHaveBeenCalledWith('rep-1', 'user-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('calls next when report not found', async () => {
      const { req, res, next } = makeMocks({ params: { id: 'gone' } });
      mockReport.delete.mockImplementationOnce(() => { throw new Error('not found'); });

      await ctrl.delete(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
