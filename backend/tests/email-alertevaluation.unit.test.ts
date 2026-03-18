/**
 * Unit Tests - EmailService & AlertEvaluationService
 * Nodemailer and external dependencies mocked entirely.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSendMail = jest.fn();
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

jest.mock('fs/promises', () => ({
  __esModule: true,
  default: {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
  },
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
}));

jest.mock('../src/services/MonitoringService', () => ({
  monitoringService: {
    getCurrentMetrics: jest.fn(),
  },
}));

jest.mock('../src/services/NotificationService', () => ({
  __esModule: true,
  default: {
    emitMonitoringSnapshot: jest.fn(),
  },
  notificationService: {
    emitMonitoringSnapshot: jest.fn(),
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import nodemailer from 'nodemailer';
import { EmailService } from '../src/services/EmailService';
import { AlertEvaluationService } from '../src/services/AlertEvaluationService';
import { monitoringService } from '../src/services/MonitoringService';
import notificationService from '../src/services/NotificationService';

const mockMonitoring = monitoringService as jest.Mocked<typeof monitoringService>;
const mockNotification = notificationService as jest.Mocked<typeof notificationService>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAlert(overrides: any = {}) {
  return {
    id: 'alert-1',
    server_id: 'srv-1',
    server_name: 'Web Server',
    message: 'CPU usage critically high',
    severity: 'critical' as const,
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved: false,
    resolved_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── EmailService ─────────────────────────────────────────────────────────────

describe('EmailService (unit)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.SMTP_MAX_RETRIES = '3';
    process.env.SMTP_RETRY_DELAY_MS = '0';
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('creates smtp transporter when SMTP_MODE is real', () => {
      process.env.SMTP_MODE = 'real';
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';

      new EmailService();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'smtp.example.com', port: 587 })
      );
    });

    it('creates json transporter by default in emulated mode', () => {
      delete process.env.SMTP_MODE;
      process.env.SMTP_HOST = 'smtp.example.com';

      new EmailService();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ jsonTransport: true })
      );
    });

    it('throws when SMTP_MODE is real and SMTP_HOST is missing', () => {
      process.env.SMTP_MODE = 'real';
      delete process.env.SMTP_HOST;

      expect(() => new EmailService()).toThrow('SMTP_HOST is required when SMTP_MODE=real');
    });

    it('reads default recipients from ALERT_EMAIL_TO env', () => {
      process.env.ALERT_EMAIL_TO = 'a@x.com,b@x.com';
      // No error; service parses it
      expect(() => new EmailService()).not.toThrow();
    });
  });

  describe('sendCriticalAlertNotification', () => {
    it('sends email to configured recipients', async () => {
      process.env.ALERT_EMAIL_TO = 'admin@monitoring.local';
      process.env.EMAIL_EMULATION_OUTPUT_DIR = './data/test-emails';
      mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

      const service = new EmailService();
      await service.sendCriticalAlertNotification(makeAlert());

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['admin@monitoring.local'],
          subject: expect.stringContaining('CRITICAL'),
          text: expect.stringContaining('CPU usage critically high'),
          html: expect.stringContaining('<h2>Alerta critica detectada</h2>'),
        })
      );
      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('data\\test-emails'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/alert-1\.html$/),
        expect.stringContaining('CPU usage critically high'),
        'utf8'
      );
    });

    it('includes server name in subject when available', async () => {
      process.env.ALERT_EMAIL_TO = 'admin@monitoring.local';
      process.env.SMTP_MODE = 'real';
      process.env.SMTP_HOST = 'smtp.example.com';
      mockSendMail.mockResolvedValue({});

      const service = new EmailService();
      await service.sendCriticalAlertNotification(makeAlert({ server_name: 'DB Server' }));

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('DB Server'),
        })
      );
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('skips sending when recipients are whitespace-only', async () => {
      // Setting only spaces causes every entry to trim to '' and be filtered out.
      // A plain '' would fall back to the 'admin@monitoring.local' default in the service.
      process.env.ALERT_EMAIL_TO = ' , , ';

      const service = new EmailService();
      await service.sendCriticalAlertNotification(makeAlert());

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('propagates error when sendMail fails', async () => {
      process.env.ALERT_EMAIL_TO = 'admin@monitoring.local';
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

      const service = new EmailService();
      await expect(service.sendCriticalAlertNotification(makeAlert())).rejects.toThrow(
        'SMTP connection refused'
      );
      expect(mockSendMail).toHaveBeenCalledTimes(3);
    });

    it('includes all alert fields in email body', async () => {
      process.env.ALERT_EMAIL_TO = 'admin@monitoring.local';
      mockSendMail.mockResolvedValue({});

      const service = new EmailService();
      const alert = makeAlert({ severity: 'critical', message: 'Disk full' });
      await service.sendCriticalAlertNotification(alert);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.text).toContain('critical');
      expect(callArgs.text).toContain('Disk full');
      expect(callArgs.html).toContain('Disk full');
      expect(callArgs.html).toContain('alert-1');
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('retries failed deliveries until a later attempt succeeds', async () => {
      process.env.ALERT_EMAIL_TO = 'admin@monitoring.local';
      mockSendMail
        .mockRejectedValueOnce(new Error('temporary smtp failure'))
        .mockResolvedValueOnce({ messageId: 'msg-2' });

      const service = new EmailService();
      await service.sendCriticalAlertNotification(makeAlert());

      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });
  });
});

// ─── AlertEvaluationService ───────────────────────────────────────────────────

describe('AlertEvaluationService (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('start()', () => {
    it('starts the evaluation interval', async () => {
      mockMonitoring.getCurrentMetrics.mockResolvedValue({ servers: [] } as any);
      const service = new AlertEvaluationService(1000);

      service.start();

      // First immediate call
      await Promise.resolve();
      expect(mockMonitoring.getCurrentMetrics).toHaveBeenCalledTimes(1);
    });

    it('emits monitoring snapshot after fetching metrics', async () => {
      const snapshot = { servers: [{ id: 's1' }] };
      mockMonitoring.getCurrentMetrics.mockResolvedValue(snapshot as any);
      const service = new AlertEvaluationService(1000);

      service.start();
      await Promise.resolve();
      await Promise.resolve(); // flush

      expect(mockNotification.emitMonitoringSnapshot).toHaveBeenCalledWith(snapshot);
    });

    it('is idempotent — calling start twice does not create two timers', async () => {
      mockMonitoring.getCurrentMetrics.mockResolvedValue({} as any);
      const service = new AlertEvaluationService(1000);

      service.start();
      service.start(); // second call should be ignored

      await Promise.resolve();
      // getCurrentMetrics called once for the first start only
      expect(mockMonitoring.getCurrentMetrics).toHaveBeenCalledTimes(1);
    });

    it('does not throw when getCurrentMetrics rejects', async () => {
      mockMonitoring.getCurrentMetrics.mockRejectedValue(new Error('Prometheus down'));
      const service = new AlertEvaluationService(1000);

      expect(() => service.start()).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();
    });

    it('runs again after the interval elapses', async () => {
      mockMonitoring.getCurrentMetrics.mockResolvedValue({} as any);
      const service = new AlertEvaluationService(1000);

      service.start();
      await Promise.resolve();
      await Promise.resolve();

      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMonitoring.getCurrentMetrics).toHaveBeenCalledTimes(2);
    });
  });

  describe('stop()', () => {
    it('stops the interval', async () => {
      mockMonitoring.getCurrentMetrics.mockResolvedValue({} as any);
      const service = new AlertEvaluationService(1000);

      service.start();
      await Promise.resolve();
      await Promise.resolve();

      service.stop();
      jest.advanceTimersByTime(5000);

      // No additional calls after stop
      expect(mockMonitoring.getCurrentMetrics).toHaveBeenCalledTimes(1);
    });

    it('is safe to call before start', () => {
      const service = new AlertEvaluationService(1000);
      expect(() => service.stop()).not.toThrow();
    });

    it('allows the service to be restarted after stop', async () => {
      mockMonitoring.getCurrentMetrics.mockResolvedValue({} as any);
      const service = new AlertEvaluationService(1000);

      service.start();
      await Promise.resolve();
      await Promise.resolve();

      service.stop();
      service.start();
      await Promise.resolve();
      await Promise.resolve();

      // Called once on first start, once on restart
      expect(mockMonitoring.getCurrentMetrics).toHaveBeenCalledTimes(2);
    });
  });
});
