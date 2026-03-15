/**
 * Report Generation Routes
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report generation and management (ASFI compliance)
 */

import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
const reportController = new ReportController();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
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
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, asfi, custom]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *     responses:
 *       200:
 *         description: List of reports
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
 *                     reports:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Report'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */
router.get('/', reportController.getAll);

/**
 * @swagger
 * /api/reports/statistics:
 *   get:
 *     summary: Get report statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report statistics
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
 *                     total:
 *                       type: integer
 *                     by_type:
 *                       type: object
 *                     by_status:
 *                       type: object
 */
router.get('/statistics', reportController.getStatistics);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Reports]
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
 *         description: Report details
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
 *                     report:
 *                       $ref: '#/components/schemas/Report'
 *       404:
 *         description: Report not found
 */
router.get('/:id', reportController.getById);

/**
 * @swagger
 * /api/reports/{id}/download:
 *   get:
 *     summary: Download report PDF
 *     tags: [Reports]
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
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Report not found
 */
router.get('/:id/download', reportController.download);

/**
 * @swagger
 * /api/reports/generate:
 *   post:
 *     summary: Generate a new report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - from
 *               - to
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [daily, weekly, monthly, asfi, custom]
 *                 example: daily
 *               from:
 *                 type: string
 *                 format: date
 *                 example: '2026-03-14'
 *               to:
 *                 type: string
 *                 format: date
 *                 example: '2026-03-15'
 *               include_charts:
 *                 type: boolean
 *                 default: false
 *               include_incidents:
 *                 type: boolean
 *                 default: true
 *               servers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Report generation started
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
 *                     report:
 *                       $ref: '#/components/schemas/Report'
 *       400:
 *         description: Invalid request parameters
 */
router.post('/generate', authorize('ADMIN', 'OPERATOR'), reportController.generate);

/**
 * @swagger
 * /api/reports/generate/asfi:
 *   post:
 *     summary: Generate ASFI compliance report
 *     description: Generate a report complying with ASFI Resolution N° 362/2021
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from
 *               - to
 *             properties:
 *               from:
 *                 type: string
 *                 format: date
 *                 example: '2026-03-01'
 *               to:
 *                 type: string
 *                 format: date
 *                 example: '2026-03-15'
 *     responses:
 *       201:
 *         description: ASFI report generation started
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
 *                     report:
 *                       $ref: '#/components/schemas/Report'
 */
router.post('/generate/asfi', authorize('ADMIN', 'OPERATOR'), reportController.generateAsfi);

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Delete a report
 *     tags: [Reports]
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
 *         description: Report deleted successfully
 *       404:
 *         description: Report not found
 */
router.delete('/:id', authorize('ADMIN'), reportController.delete);

export default router;
