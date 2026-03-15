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
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
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
 *                   $ref: '#/components/schemas/Server'
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
 *               ip_address:
 *                 type: string
 *               type:
 *                 type: string
 *               environment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Server created
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
 *               ip_address:
 *                 type: string
 *               type:
 *                 type: string
 *               environment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Server updated
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
 */
router.get('/:id/metrics', serverController.getMetrics);

export default router;
