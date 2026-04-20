// /* needed */
// routes/fullProduct.route.js - גרסה מתוקנת
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { checkProductOwnership } from '../middlewares/checkOwnership.middleware.js';
import { createContentLimiter } from '../middlewares/rateLimiter.middleware.js';
import { enforceAffiliateLimit } from '../middlewares/subscription.middleware.js';
import { 
  createFullProduct, 
  getFullProduct, 
  getAllFullProducts, 
  updateFullProduct, 
  deleteFullProduct, 
  refreshProductData 
} from '../controllers/fullProductController.js';

const router = express.Router();

// 🔧 Validation פשוט במקום validators חסרים
const validateProductId = (req, res, next) => {
  const { id } = req.params;
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'מזהה מוצר לא תקין'
    });
  }
  next();
};

const validateCreateProduct = (req, res, next) => {
  const { productData, recommendation } = req.body;
  
  if (!productData) {
    return res.status(400).json({
      success: false,
      message: 'נתוני מוצר הם שדה חובה'
    });
  }
  
  if (!recommendation || recommendation.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'המלצה חייבת להכיל לפחות 5 תווים'
    });
  }
  
  if (recommendation.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'המלצה לא יכולה להכיל יותר מ-1000 תווים'
    });
  }
  
  next();
};

const validateUpdateProduct = (req, res, next) => {
  const { recommendation, title } = req.body;
  
  if (recommendation !== undefined) {
    if (typeof recommendation !== 'string' || recommendation.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'המלצה חייבת להכיל לפחות 5 תווים'
      });
    }
    
    if (recommendation.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'המלצה לא יכולה להכיל יותר מ-1000 תווים'
      });
    }
  }
  
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'כותרת חייבת להכיל לפחות 3 תווים'
      });
    }
  }
  
  next();
};

// נתיבים פתוחים (גישה לכולם)
router.get('/', getAllFullProducts);
router.get('/:id', validateProductId, getFullProduct);

// נתיבים מוגנים (דורשים הרשאות)
router.post('/',
  auth,
  createContentLimiter,
  validateCreateProduct,
  enforceAffiliateLimit,
  createFullProduct
);

router.put('/:id', 
  auth, 
  validateUpdateProduct, 
  checkProductOwnership, 
  updateFullProduct
);

router.delete('/:id', 
  auth, 
  validateProductId, 
  checkProductOwnership, 
  deleteFullProduct
);

router.get('/:id/refresh', 
  auth, 
  validateProductId, 
  checkProductOwnership, 
  refreshProductData
);

export { router as fullProductRouter };