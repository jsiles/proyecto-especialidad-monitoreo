/**
 * Server Management Routes
 * @swagger
 * tags:
 *   name: Servers
 *   description: Server management and monitoring
 */

import { Router } from 'express';
import { ServerController } from '../controllers/ServerController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
const serverController = new ServerController();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/servers:
 *   get:
 *     summary: List all servers
 *     tags: [Servers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [online, offline, degraded, unknown]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [application, database, web, cache, spi, atc, other]
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *           enum: [production, staging, development, testing]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of servers
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
 *                     servers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Server'
 *                     total:
 *                       type: integer
 */
router.get('/', serverController.getAll);

/**
 * @swagger
 * /api/servers/{id}:
 *   get:
 *     summary: Get server by ID
 *     tags: [Servers]
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
 *         description: Server details
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
 *                     server:
 *                       $ref: '#/components/schemas/Server'
 *       404:
 *         description: Server not found
 */
router.get('/:id', serverController.getById);

/**
 * @swagger
 * /api/servers:
 *   post:
 *     summary: Create new server
 *     tags: [Servers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ip_address
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: Server-APP-01
 *               ip_address:
 *                 type: string
 *                 example: 192.168.1.100
 *               type:
 *                 type: string
 *                 enum: [application, database, web, cache, spi, atc, other]
 *               environment:
 *                 type: string
 *                 enum: [production, staging, development, testing]
 *     responses:
 *       201:
 *         description: Server created
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
 *                     server:
 *                       $ref: '#/components/schemas/Server'
 *       403:
 *         description: Admin role required
 */
router.post('/', authorize('ADMIN'), serverController.create);

/**
 * @swagger
 * /api/servers/{id}:
 *   put:
 *     summary: Update server
 *     tags: [Servers]
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
 *               name:
 *                 type: string
 *                 example: Server-APP-01
 *               ip_address:
 *                 type: string
 *                 example: 192.168.1.100
 *               type:
 *                 type: string
 *                 enum: [application, database, web, cache, spi, atc, other]
 *               environment:
 *                 type: string
 *                 enum: [production, staging, development, testing]
 *               status:
 *                 type: string
 *                 enum: [online, offline, degraded, unknown]
 *     responses:
 *       200:
 *         description: Server updated
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
 *                     server:
 *                       $ref: '#/components/schemas/Server'
 *       403:
 *         description: Admin role required
 */
router.put('/:id', authorize('ADMIN'), serverController.update);

/**
 * @swagger
 * /api/servers/{id}:
 *   delete:
 *     summary: Delete server
 *     tags: [Servers]
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
 *         description: Server deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Admin role required
 */
router.delete('/:id', authorize('ADMIN'), serverController.delete);

/**
 * @swagger
 * /api/servers/{id}/status:
 *   get:
 *     summary: Get server status
 *     tags: [Servers]
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
 *         description: Server status
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
 *                     status:
 *                       type: string
 *                       enum: [online, offline, degraded, unknown]
 *                     lastCheck:
 *                       type: string
 *                       format: date-time
 */
router.get('/:id/status', serverController.getStatus);

/**
 * @swagger
 * /api/servers/{id}/metrics:
 *   get:
 *     summary: Get server metrics
 *     tags: [Servers]
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
router.get('/:id/metrics', serverController.getMetrics);

export default router;
