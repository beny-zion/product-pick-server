// routes/vendor.analytics.routes.js
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
// import { vendorAuth } from '../middlewares/vendor.auth.js';
import { VendorAnalyticsController } from '../controllers/analytics/vendor.analytics.controller.js';

const router = express.Router();



// קבלת סטטיסטיקות כלליות
router.get('/stats',auth, VendorAnalyticsController.getVendorStats);

// קבלת סטטיסטיקות לפי מוצר
router.get('/product/:productId/stats', VendorAnalyticsController.getProductStats);

export { router as VendorAnalyticsRouter };