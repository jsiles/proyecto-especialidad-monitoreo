/**
 * Report Generation Routes
 */

import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();
const reportController = new ReportController();

// All routes require authentication
router.use(authenticate);

// Get reports
router.get('/', reportController.getAll);
router.get('/:id', reportController.getById);
router.get('/:id/download', reportController.download);

// Generate reports (admin/operator only)
router.post('/generate', authorize('ADMIN', 'OPERATOR'), reportController.generate);
router.post('/generate/asfi', authorize('ADMIN', 'OPERATOR'), reportController.generateAsfi);

// Delete reports (admin only)
router.delete('/:id', authorize('ADMIN'), reportController.delete);

export default router;
