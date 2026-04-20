// src/routes/amazon.routes.js
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { enforceAmazonAccess } from '../middlewares/subscription.middleware.js';
import { validateProduct } from '../controllers/amazon.controller.js';

const router = express.Router();

// POST /api/amazon/products/validate - אימות מוצר אמזון (PRO only)
router.post('/products/validate', auth, enforceAmazonAccess, validateProduct);

export const amazonRouter = router;
