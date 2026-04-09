// src/routes/amazon.routes.js
import express from 'express';
import { validateProduct } from '../controllers/amazon.controller.js';

const router = express.Router();

// POST /api/amazon/products/validate - אימות מוצר אמזון
router.post('/products/validate', validateProduct);

export const amazonRouter = router;
