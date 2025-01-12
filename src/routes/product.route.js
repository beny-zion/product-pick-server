import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import * as productController from '../controllers/productController.js';

const router = express.Router();

// נתיב לקבלת כל המוצרים (פתוח לכולם)
router.get('/', productController.getAllProducts);

// קבלת מוצר ספציפי (פתוח לכולם)
router.get('/:id', productController.getProduct);

// הוספת מוצר חדש (דורש הרשאות מוכר)
router.post('/', auth,  productController.createProduct);

// עדכון מוצר (דורש הרשאות מוכר + בעלות על המוצר)
router.put('/:id', auth,  productController.updateProduct);

// מחיקת מוצר (דורש הרשאות מוכר + בעלות על המוצר)
router.delete('/:id', auth, productController.deleteProduct);

export { router as productRouter };