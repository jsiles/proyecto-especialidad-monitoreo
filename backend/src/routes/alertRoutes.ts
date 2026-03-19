/**
 * Alert Management Routes
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Alert and threshold management
 */

import { Router } from 'express';
import { AlertController } from '../controllers/AlertController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
const alertController = new AlertController();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: List all alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: server_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, warning, info]
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of alerts
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
 *                     alerts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Alert'
 */
router.get('/', alertController.getAll);

/**
 * @swagger
 * /api/alerts/active:
 *   get:
 *     summary: Get active alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, warning, info]
 *     responses:
 *       200:
 *         description: List of active alerts
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
 *                     alerts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Alert'
 *                     total:
 *                       type: integer
 */
router.get('/active', alertController.getActive);

/**
 * @swagger
 * /api/alerts/thresholds:
 *   get:
 *     summary: Get all thresholds
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: server_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of thresholds
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
 *                     thresholds:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Threshold'
 *   post:
 *     summary: Create threshold
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - server_id
 *               - metric_type
 *               - threshold_value
 *               - severity
 *             properties:
 *               server_id:
 *                 type: string
 *                 nullable: true
 *               metric_type:
 *                 type: string
 *                 enum: [cpu, memory, disk, network_in, network_out, latency]
 *               threshold_value:
 *                 type: number
 *               severity:
 *                 type: string
 *                 enum: [critical, warning]
 *     responses:
 *       201:
 *         description: Threshold created
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
 *                     threshold:
 *                       $ref: '#/components/schemas/Threshold'
 *       403:
 *         description: Admin role required
 */
router.get('/thresholds', alertController.getThresholds);
router.post('/thresholds', authorize('ADMIN'), alertController.createThreshold);

/**
 * @swagger
 * /api/alerts/thresholds/{id}:
 *   put:
 *     summary: Update threshold
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               threshold_value:
 *                 type: number
 *               severity:
 *                 type: string
 *                 enum: [warning, critical]
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Threshold updated
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
 *                     threshold:
 *                       $ref: '#/components/schemas/Threshold'
 *       403:
 *         description: Admin role required
 *   delete:
 *     summary: Delete threshold
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Threshold deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Admin role required
 */
router.put('/thresholds/:id', authorize('ADMIN'), alertController.updateThreshold);
router.delete('/thresholds/:id', authorize('ADMIN'), alertController.deleteThreshold);

/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Get alert by ID
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert details
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
 *                     alert:
 *                       $ref: '#/components/schemas/Alert'
 */
router.get('/:id', alertController.getById);

/**
 * @swagger
 * /api/alerts/{id}/acknowledge:
 *   put:
 *     summary: Acknowledge alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert acknowledged
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
 *                     alert:
 *                       $ref: '#/components/schemas/Alert'
 *                     message:
 *                       type: string
 *                       example: Alert acknowledged
 */
router.put('/:id/acknowledge', alertController.acknowledge);

/**
 * @swagger
 * /api/alerts/{id}/resolve:
 *   put:
 *     summary: Resolve alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert resolved
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
 *                     alert:
 *                       $ref: '#/components/schemas/Alert'
 *                     message:
 *                       type: string
 *                       example: Alert resolved
 */
router.put('/:id/resolve', alertController.resolve);

export default router;
