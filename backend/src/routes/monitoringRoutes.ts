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
 *                   $ref: '#/components/schemas/MetricsSnapshot'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MetricsSummary'
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
 *       - in: query
 *         name: server_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: metric_type
 *         schema:
 *           type: string
 *           enum: [cpu, memory, disk, network]
 *     responses:
 *       200:
 *         description: Historical metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MetricsHistorySeries'
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
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [1m, 5m, 15m, 1h, 1d]
 *       - in: query
 *         name: metric_type
 *         schema:
 *           type: string
 *           enum: [cpu, memory, disk, network]
 *     responses:
 *       200:
 *         description: Server historical metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     serverId:
 *                       type: string
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MetricsHistorySeries'
 */
router.get('/history/:serverId', monitoringController.getServerHistory);

/**
 * @swagger
 * /api/metrics/spi:
 *   get:
 *     summary: Get SPI metrics
 *     description: Returns near real-time operational metrics for the SPI national payments system.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SPI metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SPIMetrics'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     system:
 *                       type: string
 *                       example: SPI
 */
router.get('/spi', metricsController.getSPIMetrics);

/**
 * @swagger
 * /api/metrics/atc:
 *   get:
 *     summary: Get ATC metrics
 *     description: Returns near real-time operational metrics for the ATC card-processing system.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ATC metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ATCMetrics'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     system:
 *                       type: string
 *                       example: ATC
 */
router.get('/atc', metricsController.getATCMetrics);

/**
 * @swagger
 * /api/metrics/linkser:
 *   get:
 *     summary: Get Linkser metrics
 *     description: Returns near real-time operational metrics for the Linkser debit and credit card service.
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Linkser metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LinkserMetrics'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     system:
 *                       type: string
 *                       example: LINKSER
 */
router.get('/linkser', metricsController.getLinkserMetrics);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ServerMetrics'
 */
router.get('/server/:serverId', monitoringController.getServerMetrics);

router.get('/prometheus', monitoringController.getPrometheusMetrics);

export default router;
