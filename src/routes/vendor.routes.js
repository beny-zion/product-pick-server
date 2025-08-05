// routes/vendor.routes.js
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { vendorAuth } from '../middlewares/middleware.auth.js';
import { VendorAnalyticsController } from '../controllers/analytics/vendor.analytics.controller.js';
import { VendorProductsController } from '../controllers/analytics/vendor.products.controller.js';

const router = express.Router();

// מוצרי המוכר
router.get('/products', auth, vendorAuth, VendorProductsController.getVendorProducts);
router.get('/products/:id', auth, vendorAuth, VendorProductsController.getVendorProduct);
router.put('/products/:id', auth, vendorAuth, VendorProductsController.updateProduct);
router.delete('/products/:id', auth, vendorAuth, VendorProductsController.deleteProduct);

// סטטיסטיקות
router.get('/analytics/stats', auth, vendorAuth, VendorAnalyticsController.getVendorStats);
router.get('/analytics/product/:productId/stats', auth, vendorAuth, VendorAnalyticsController.getProductStats);
router.get('/analytics/all-products', auth, vendorAuth, VendorAnalyticsController.getAllProductsStats);

export { router as vendorRouter };