// src/validators/product.validator.js
import { body, param, query, validationResult } from 'express-validator';

/**
 * 📦 Product Validation - בדיקת תקינות מוצרים
 * 
 * מה זה עושה?
 * - בודק שכל השדות החובה קיימים
 * - מוודא שה-URLs תקינים
 * - בודק טווחי מחירים
 */

// Middleware לטיפול בשגיאות
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'נתונים לא תקינים',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

// Validation ליצירת מוצר
export const validateCreateProduct = [
  body('productData')
    .isObject().withMessage('נתוני מוצר חובה'),
    
  body('productData.productId')
    .notEmpty().withMessage('מזהה מוצר אליאקספרס חובה')
    .isString().withMessage('מזהה מוצר צריך להיות מחרוזת'),
    
  body('productData.title')
    .notEmpty().withMessage('כותרת חובה')
    .isLength({ min: 5, max: 200 }).withMessage('כותרת צריכה להיות בין 5 ל-200 תווים')
    .trim(),
    
  body('productData.displayMedia')
    .optional()
    .isURL().withMessage('כתובת תמונה לא תקינה'),
    
  body('productData.price.current')
    .isNumeric().withMessage('מחיר צריך להיות מספר')
    .isFloat({ min: 0 }).withMessage('מחיר לא יכול להיות שלילי'),
    
  body('recommendation')
    .notEmpty().withMessage('המלצה חובה')
    .isLength({ min: 10, max: 1000 }).withMessage('המלצה צריכה להיות בין 10 ל-1000 תווים')
    .trim(),
    
  handleValidationErrors
];

// Validation לעדכון מוצר
export const validateUpdateProduct = [
  param('id')
    .isMongoId().withMessage('מזהה מוצר לא תקין'),
    
  body('title')
    .optional()
    .isLength({ min: 5, max: 200 }).withMessage('כותרת צריכה להיות בין 5 ל-200 תווים')
    .trim(),
    
  body('recommendation')
    .optional()
    .isLength({ min: 10, max: 1000 }).withMessage('המלצה צריכה להיות בין 10 ל-1000 תווים')
    .trim(),
    
  body('displayImage')
    .optional()
    .isURL().withMessage('כתובת תמונה לא תקינה'),
    
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE']).withMessage('סטטוס לא תקין'),
    
  body('affiliateLink')
    .optional()
    .isURL().withMessage('קישור שיווקי לא תקין'),
    
  handleValidationErrors
];

// Validation לשאילתות חיפוש
export const validateSearchQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('מספר עמוד צריך להיות חיובי'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('מספר תוצאות צריך להיות בין 1 ל-100'),
    
  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('מחיר מינימלי לא יכול להיות שלילי'),
    
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('מחיר מקסימלי לא יכול להיות שלילי'),
    
  query('sort')
    .optional()
    .isIn(['price_asc', 'price_desc', 'newest', 'oldest', 'rating']).withMessage('סוג מיון לא תקין'),
    
  handleValidationErrors
];

// Validation למזהה מוצר
export const validateProductId = [
  param('id')
    .isMongoId().withMessage('מזהה מוצר לא תקין'),
    
  handleValidationErrors
];

// Validation ל-URL של AliExpress
export const validateAliExpressUrl = [
  body('url')
    .notEmpty().withMessage('כתובת URL חובה')
    .isURL().withMessage('כתובת URL לא תקינה')
    .matches(/aliexpress\.com/i).withMessage('חייבת להיות כתובת של AliExpress'),
    
  handleValidationErrors
];