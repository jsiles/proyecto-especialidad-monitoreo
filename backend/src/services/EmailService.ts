import fs from 'fs/promises';
import nodemailer, { Transporter } from 'nodemailer';
import path from 'path';
import { logger } from '../utils/logger';
import { AlertResponseDTO } from '../dtos/AlertDTO';

interface CriticalAlertEmailPayload {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}

type SmtpMode = 'emulated' | 'real';

export class EmailService {
  private transporter: Transporter;
  private fromAddress: string;
  private defaultRecipients: string[];
  private maxRetries: number;
  private retryDelayMs: number;
  private smtpMode: SmtpMode;
  private emulationOutputDir: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'noreply@monitoring.local';
    this.defaultRecipients = (process.env.ALERT_EMAIL_TO || 'admin@monitoring.local')
      .split(',')
      .map((recipient) => recipient.trim())
      .filter(Boolean);
    this.maxRetries = this.parsePositiveInteger(process.env.SMTP_MAX_RETRIES, 3);
    this.retryDelayMs = this.parsePositiveInteger(process.env.SMTP_RETRY_DELAY_MS, 250);
    this.smtpMode = this.getSmtpMode();
    this.emulationOutputDir = path.resolve(
      process.env.EMAIL_EMULATION_OUTPUT_DIR || './data/emulated-emails'
    );

    if (this.smtpMode === 'real') {
      if (!process.env.SMTP_HOST) {
        throw new Error('SMTP_HOST is required when SMTP_MODE=real');
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      });
    } else {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }

    logger.info('Email service transport configured', {
      smtpMode: this.smtpMode,
      hasSmtpHost: Boolean(process.env.SMTP_HOST),
      recipientsConfigured: this.defaultRecipients.length,
      emulationOutputDir: this.smtpMode === 'emulated' ? this.emulationOutputDir : undefined,
    });
  }

  public async sendCriticalAlertNotification(alert: AlertResponseDTO): Promise<void> {
    if (this.defaultRecipients.length === 0) {
      logger.warn('No recipients configured for critical alert emails', { alertId: alert.id });
      return;
    }

    const payload = this.buildCriticalAlertPayload(alert);
    await this.sendMailWithRetry(payload, alert.id);

    if (this.smtpMode === 'emulated') {
      await this.persistEmulatedEmail(payload, alert.id);
    }

    logger.info('Critical alert email sent', {
      alertId: alert.id,
      recipients: this.defaultRecipients,
    });
  }

  private buildCriticalAlertPayload(alert: AlertResponseDTO): CriticalAlertEmailPayload {
    const serverName = alert.server_name || alert.server_id;
    const subject = `[CRITICAL] ${serverName} - ${alert.message}`;
    const text = [
      'Se ha detectado una alerta crítica en la plataforma de monitoreo.',
      `Servidor: ${serverName}`,
      `ID del servidor: ${alert.server_id}`,
      `Severidad: ${alert.severity}`,
      `Mensaje: ${alert.message}`,
      `Fecha: ${alert.created_at}`,
      `Alerta ID: ${alert.id}`,
    ].join('\n');

    const html = [
      '<h2>Alerta critica detectada</h2>',
      '<p>Se ha detectado una alerta critica en la plataforma de monitoreo.</p>',
      '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">',
      `<tr><td><strong>Servidor</strong></td><td>${this.escapeHtml(serverName)}</td></tr>`,
      `<tr><td><strong>ID servidor</strong></td><td>${this.escapeHtml(alert.server_id)}</td></tr>`,
      `<tr><td><strong>Severidad</strong></td><td>${this.escapeHtml(alert.severity)}</td></tr>`,
      `<tr><td><strong>Mensaje</strong></td><td>${this.escapeHtml(alert.message)}</td></tr>`,
      `<tr><td><strong>Fecha</strong></td><td>${this.escapeHtml(alert.created_at)}</td></tr>`,
      `<tr><td><strong>Alerta ID</strong></td><td>${this.escapeHtml(alert.id)}</td></tr>`,
      '</table>',
    ].join('');

    return {
      from: this.fromAddress,
      to: this.defaultRecipients,
      subject,
      text,
      html,
    };
  }

  private async sendMailWithRetry(payload: CriticalAlertEmailPayload, alertId: string): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        await this.transporter.sendMail(payload);
        return;
      } catch (error) {
        lastError = error;

        logger.warn('Critical alert email attempt failed', {
          alertId,
          attempt,
          maxRetries: this.maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to send critical alert email');
  }

  private async persistEmulatedEmail(payload: CriticalAlertEmailPayload, alertId: string): Promise<void> {
    await fs.mkdir(this.emulationOutputDir, { recursive: true });

    const filePath = path.join(
      this.emulationOutputDir,
      `${new Date().toISOString().replace(/[:.]/g, '-')}-${this.toSafeFilename(alertId)}.html`
    );

    const document = [
      '<!DOCTYPE html>',
      '<html lang="es">',
      '<head>',
      '  <meta charset="UTF-8" />',
      `  <title>${this.escapeHtml(payload.subject)}</title>`,
      '  <style>body{font-family:Arial,sans-serif;margin:24px;color:#1f2937;}',
      '  .meta{margin-bottom:24px;padding:16px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;}',
      '  .meta p{margin:4px 0;}',
      '  </style>',
      '</head>',
      '<body>',
      '  <div class="meta">',
      `    <p><strong>From:</strong> ${this.escapeHtml(payload.from)}</p>`,
      `    <p><strong>To:</strong> ${this.escapeHtml(payload.to.join(', '))}</p>`,
      `    <p><strong>Subject:</strong> ${this.escapeHtml(payload.subject)}</p>`,
      `    <p><strong>Generated at:</strong> ${this.escapeHtml(new Date().toISOString())}</p>`,
      '  </div>',
      payload.html,
      '</body>',
      '</html>',
    ].join('\n');

    await fs.writeFile(filePath, document, 'utf8');

    logger.info('Emulated email persisted to HTML file', {
      alertId,
      filePath,
    });
  }

  private parsePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getSmtpMode(): SmtpMode {
    const rawMode = (process.env.SMTP_MODE || 'emulated').trim().toLowerCase();
    return rawMode === 'real' ? 'real' : 'emulated';
  }

  private toSafeFilename(value: string): string {
    return value.replace(/[^a-zA-Z0-9-_]/g, '-');
  }

  private delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const emailService = new EmailService();
export default emailService;
