/* needed */
// routes/analytics.routes.js - גרסה מפושטת
import express from 'express';
// import { auth } from '../middlewares/middleware.auth.js';
import { auth_id } from '../middlewares/middleware.auth.id.js';
import { ProductStatsController } from '../controllers/analytics/productStats.controller.js';

const router = express.Router();

// נתיבים פשוטים לאנליטיקה
router.post('/product/modal-open', auth_id, ProductStatsController.trackModalOpen);
router.post('/product/click', auth_id, ProductStatsController.trackClick);
router.get('/product/:id/stats', ProductStatsController.getStats);
router.post('/products/batch-stats', ProductStatsController.getBatchStats);

export { router as analyticsRouter };