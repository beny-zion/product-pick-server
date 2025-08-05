// /* needed */
// // עדכון לקובץ src/routes/fullProduct.route.js
// import express from 'express';
// import { auth } from '../middlewares/middleware.auth.js';
// // import { auth_id } from '../middlewares/middleware.auth.id.js';
// import { 
//   createFullProduct, 
//   getFullProduct, 
//   getAllFullProducts, 
//   updateFullProduct, 
//   deleteFullProduct, 
//   refreshProductData 
// } from '../controllers/fullProductController.js';

// const router = express.Router();

// // נתיבים פתוחים (גישה לכולם)
// router.get('/', getAllFullProducts);
// router.get('/:id', getFullProduct);

// // נתיבים מוגנים (דורשים הרשאות)
// router.post('/', auth, createFullProduct);
// router.put('/:id', auth, updateFullProduct);
// router.delete('/:id', auth, deleteFullProduct);
// router.get('/:id/refresh', auth, refreshProductData);

// export { router as fullProductRouter };
// routes/fullProduct.route.js
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { checkProductOwnership } from '../middlewares/checkOwnership.middleware.js'; // 🆕
import { createContentLimiter } from '../middlewares/rateLimiter.middleware.js'; // 🆕
import { // 🆕 Validators
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
  validateSearchQuery
} from '../validators/product.validator.js';
import { 
  createFullProduct, 
  getFullProduct, 
  getAllFullProducts, 
  updateFullProduct, 
  deleteFullProduct, 
  refreshProductData 
} from '../controllers/fullProductController.js';

const router = express.Router();

// נתיבים פתוחים (גישה לכולם)

// קבלת כל המוצרים - עם validation 🆕
router.get('/', 
  validateSearchQuery, // 🆕 בדיקת query parameters
  getAllFullProducts
);

// קבלת מוצר בודד - עם validation 🆕
router.get('/:id', 
  validateProductId, // 🆕
  getFullProduct
);

// נתיבים מוגנים (דורשים הרשאות)

// יצירת מוצר - עם rate limiting ו-validation 🆕
router.post('/', 
  auth, 
  createContentLimiter, // 🆕 הגבלת כמות מוצרים
  validateCreateProduct, // 🆕 בדיקת תקינות
  createFullProduct
);

// עדכון מוצר - עם בדיקת בעלות ו-validation 🆕
router.put('/:id', 
  auth, 
  validateUpdateProduct, // 🆕 בדיקת תקינות
  checkProductOwnership, // 🆕 בדיקת בעלות
  updateFullProduct
);

// מחיקת מוצר - עם בדיקת בעלות 🆕
router.delete('/:id', 
  auth, 
  validateProductId, // 🆕
  checkProductOwnership, // 🆕 בדיקת בעלות
  deleteFullProduct
);

// רענון נתוני מוצר - עם בדיקת בעלות 🆕
router.get('/:id/refresh', 
  auth, 
  validateProductId, // 🆕
  checkProductOwnership, // 🆕 בדיקת בעלות
  refreshProductData
);

export { router as fullProductRouter };