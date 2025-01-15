// routes/vendor.routes.js
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
// import { vendorAuth } from '../middlewares/middleware.auth.js';
import { VendorAnalyticsController } from '../controllers/analytics/vendor.analytics.controller.js';
import { VendorProductsController } from '../controllers/analytics/vendor.products.controller.js';

const router = express.Router();

// מוצרי המוכר - צריך גם auth וגם vendorAuth
router.get('/products', auth, VendorProductsController.getVendorProducts);
router.get('/products/:id', auth, VendorProductsController.getVendorProduct);

// סטטיסטיקות
router.get('/analytics/stats', auth, VendorAnalyticsController.getVendorStats);
router.get('/analytics/product/:productId/stats', auth, VendorAnalyticsController.getProductStats);

export { router as vendorRouter };