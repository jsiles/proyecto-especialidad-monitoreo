/**
 * Monitoring/Metrics Routes
 */

import { Router } from 'express';
import { MonitoringController } from '../controllers/MonitoringController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
const monitoringController = new MonitoringController();

// All routes require authentication
router.use(authenticate);

// Current metrics
router.get('/', monitoringController.getCurrentMetrics);
router.get('/summary', monitoringController.getSummary);

// Historical data
router.get('/history', monitoringController.getHistory);
router.get('/history/:serverId', monitoringController.getServerHistory);

// Prometheus integration
router.get('/prometheus', monitoringController.getPrometheusMetrics);

export default router;
