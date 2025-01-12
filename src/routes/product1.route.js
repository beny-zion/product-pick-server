import express from 'express';
import { auth, vendorAuth } from '../middlewares/middleware.auth.js';
import { upload } from '../middlewares/middleware.upload.js';
import * as productController from '../controllers/productController.js';

const router = express.Router();

// הוספת מוצר חדש - רק למוכרים
router.post('createProduct/',
  auth,
  vendorAuth,
  upload.single('displayImage'),
  productController.createProduct
);

// עדכון מוצר - רק למוכר של המוצר
router.put('updateProduct/:id',
  auth,
  vendorAuth,
  upload.single('displayImage'),
  productController.updateProduct
);

// מחיקת מוצר - רק למוכר של המוצר
router.delete('deleteProduct/:id',
  auth,
  vendorAuth,
  productController.deleteProduct
);

export { router as productRouter };