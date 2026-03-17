import notificationService from './NotificationService';
import { monitoringService } from './MonitoringService';
import { logger } from '../utils/logger';

export class AlertEvaluationService {
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;

  constructor(intervalMs = 30000) {
    this.intervalMs = intervalMs;
  }

  public start(): void {
    if (this.timer) {
      return;
    }

    const runCycle = async () => {
      try {
        const snapshot = await monitoringService.getCurrentMetrics();
        notificationService.emitMonitoringSnapshot(snapshot);
      } catch (error) {
        logger.error('Alert evaluation cycle failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    void runCycle();
    this.timer = setInterval(() => {
      void runCycle();
    }, this.intervalMs);

    logger.info('Alert evaluation scheduler started', { intervalMs: this.intervalMs });
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const alertEvaluationService = new AlertEvaluationService();
export default alertEvaluationService;