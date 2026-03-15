/**
 * Server Management Routes
 */

import { Router } from 'express';
import { ServerController } from '../controllers/ServerController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
const serverController = new ServerController();

// All routes require authentication
router.use(authenticate);

// List and get servers
router.get('/', serverController.getAll);
router.get('/:id', serverController.getById);

// Admin only operations
router.post('/', authorize('ADMIN'), serverController.create);
router.put('/:id', authorize('ADMIN'), serverController.update);
router.delete('/:id', authorize('ADMIN'), serverController.delete);

// Server status
router.get('/:id/status', serverController.getStatus);
router.get('/:id/metrics', serverController.getMetrics);

export default router;
