import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { auth_id } from '../middlewares/middleware.auth.id.js';
import { ProductStatsController } from '../controllers/analytics/productStats.controller.js';
import { UserInterestsController } from '../controllers/analytics/userInterests.controller.js';

const router = express.Router();

// נתיבים לסטטיסטיקות מוצר
router.post('/product/view',auth_id, ProductStatsController.trackView);
router.post('/product/click',auth_id, ProductStatsController.trackClick);
router.get('/product/:id/stats', ProductStatsController.getStats);

// נתיבים לתחומי עניין (דורשים אותנטיקציה)
router.get('/interests', auth, UserInterestsController.getUserInterests);

export { router as analyticsRouter };