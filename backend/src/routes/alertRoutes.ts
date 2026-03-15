/**
 * Alert Management Routes
 */

import { Router } from 'express';
import { AlertController } from '../controllers/AlertController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
const alertController = new AlertController();

// All routes require authentication
router.use(authenticate);

// Get alerts
router.get('/', alertController.getAll);
router.get('/active', alertController.getActive);
router.get('/:id', alertController.getById);

// Alert actions
router.put('/:id/acknowledge', alertController.acknowledge);
router.put('/:id/resolve', alertController.resolve);

// Threshold management (admin only)
router.get('/thresholds', alertController.getThresholds);
router.post('/thresholds', authorize('ADMIN'), alertController.createThreshold);
router.put('/thresholds/:id', authorize('ADMIN'), alertController.updateThreshold);
router.delete('/thresholds/:id', authorize('ADMIN'), alertController.deleteThreshold);

export default router;
