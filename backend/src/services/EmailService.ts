import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';
import { AlertResponseDTO } from '../dtos/AlertDTO';

export class EmailService {
  private transporter: Transporter;
  private fromAddress: string;
  private defaultRecipients: string[];

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'noreply@monitoring.local';
    this.defaultRecipients = (process.env.ALERT_EMAIL_TO || 'admin@monitoring.local')
      .split(',')
      .map((recipient) => recipient.trim())
      .filter(Boolean);

    if (process.env.SMTP_HOST) {
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
  }

  public async sendCriticalAlertNotification(alert: AlertResponseDTO): Promise<void> {
    if (this.defaultRecipients.length === 0) {
      logger.warn('No recipients configured for critical alert emails', { alertId: alert.id });
      return;
    }

    const subject = `[CRITICAL] ${alert.server_name || alert.server_id} - ${alert.message}`;
    const text = [
      'Se ha detectado una alerta crítica en la plataforma de monitoreo.',
      `Servidor: ${alert.server_name || alert.server_id}`,
      `Severidad: ${alert.severity}`,
      `Mensaje: ${alert.message}`,
      `Fecha: ${alert.created_at}`,
    ].join('\n');

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: this.defaultRecipients,
      subject,
      text,
    });

    logger.info('Critical alert email sent', {
      alertId: alert.id,
      recipients: this.defaultRecipients,
    });
  }
}

export const emailService = new EmailService();
export default emailService;