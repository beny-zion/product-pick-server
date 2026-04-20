import express from 'express';
import { auth, vendorAuth } from '../middlewares/middleware.auth.js';
import { enforceStoreLimit } from '../middlewares/subscription.middleware.js';
import { StoreController } from '../controllers/store.controller.js';

const router = express.Router();

// Vendor routes (authenticated)
router.get('/my', auth, vendorAuth, StoreController.getMyStores);
router.get('/my/:storeId', auth, vendorAuth, StoreController.getMyStore);
router.post('/', auth, vendorAuth, enforceStoreLimit, StoreController.createStore);
router.put('/:storeId', auth, vendorAuth, StoreController.updateStore);
router.delete('/:storeId', auth, vendorAuth, StoreController.deleteStore);

// Public routes
router.get('/vendor/:vendorId', StoreController.getVendorStores);
router.get('/:storeIdOrSlug', StoreController.getPublicStore);
router.get('/:storeIdOrSlug/products', StoreController.getStoreProducts);

export { router as storeRouter };
