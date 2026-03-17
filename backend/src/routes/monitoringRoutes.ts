/**
 * Monitoring/Metrics Routes
 * @swagger
 * tags:
 *   name: Metrics
 *   description: Metrics and monitoring data
 */

import { Router } from 'express';
import { MonitoringController } from '../controllers/MonitoringController';
import { MetricsController } from '../controllers/MetricsController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
const monitoringController = new MonitoringController();
const metricsController = new MetricsController();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get current metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current metrics for all servers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Metrics'
 */
router.get('/', monitoringController.getCurrentMetrics);

/**
 * @swagger
 * /api/metrics/summary:
 *   get:
 *     summary: Get metrics summary
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated metrics summary
 */
router.get('/summary', monitoringController.getSummary);

/**
 * @swagger
 * /api/metrics/history:
 *   get:
 *     summary: Get historical metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [1m, 5m, 15m, 1h, 1d]
 *     responses:
 *       200:
 *         description: Historical metrics data
 */
router.get('/history', monitoringController.getHistory);

/**
 * @swagger
 * /api/metrics/history/{serverId}:
 *   get:
 *     summary: Get server historical metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serverId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Server historical metrics
 */
router.get('/history/:serverId', monitoringController.getServerHistory);

router.get('/spi', metricsController.getSPIMetrics);

router.get('/atc', metricsController.getATCMetrics);

/**
 * @swagger
 * /api/metrics/prometheus:
 *   get:
 *     summary: Get Prometheus metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prometheus metrics in text format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
/**
 * @swagger
 * /api/metrics/server/{serverId}:
 *   get:
 *     summary: Get current metrics for a specific server
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Server metrics
 */
router.get('/server/:serverId', monitoringController.getServerMetrics);

router.get('/prometheus', monitoringController.getPrometheusMetrics);

export default router;
