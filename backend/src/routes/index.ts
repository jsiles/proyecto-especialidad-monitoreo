/**
 * API Routes Index
 * Central routing configuration
 */

import { Router } from 'express';
import authRoutes from './authRoutes';
import serverRoutes from './serverRoutes';
import monitoringRoutes from './monitoringRoutes';
import alertRoutes from './alertRoutes';
import reportRoutes from './reportRoutes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/servers', serverRoutes);
router.use('/metrics', monitoringRoutes);
router.use('/alerts', alertRoutes);
router.use('/reports', reportRoutes);

export default router;
