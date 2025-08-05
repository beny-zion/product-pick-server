// src/validators/comment.validator.js
import { body, param, validationResult } from 'express-validator';

/**
 * 📝 Comment Validation - בדיקת תקינות תגובות
 * 
 * מה זה עושה?
 * - בודק שהתוכן באורך תקין
 * - מוודא שה-IDs תקינים
 * - מחזיר שגיאות ברורות
 */

// Middleware לטיפול בשגיאות validation
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

// Validation ליצירת תגובה
export const validateCreateComment = [
  body('productId')
    .notEmpty().withMessage('מזהה מוצר חובה')
    .isMongoId().withMessage('מזהה מוצר לא תקין'),
    
  body('content')
    .notEmpty().withMessage('תוכן התגובה חובה')
    .isLength({ min: 2, max: 1000 }).withMessage('תוכן התגובה צריך להיות בין 2 ל-1000 תווים')
    .trim(),
    
  body('commentType')
    .optional()
    .isIn(['QUESTION', 'OPINION', 'GENERAL']).withMessage('סוג תגובה לא תקין'),
    
  body('parentCommentId')
    .optional()
    .isMongoId().withMessage('מזהה תגובת אב לא תקין'),
    
  body('quotedComment')
    .optional()
    .isObject().withMessage('ציטוט לא תקין'),
    
  body('quotedComment.commentId')
    .optional()
    .isMongoId().withMessage('מזהה תגובה מצוטטת לא תקין'),
    
  handleValidationErrors
];

// Validation לעדכון תגובה
export const validateUpdateComment = [
  param('commentId')
    .isMongoId().withMessage('מזהה תגובה לא תקין'),
    
  body('content')
    .notEmpty().withMessage('תוכן התגובה חובה')
    .isLength({ min: 2, max: 1000 }).withMessage('תוכן התגובה צריך להיות בין 2 ל-1000 תווים')
    .trim(),
    
  handleValidationErrors
];

// Validation למזהה תגובה
export const validateCommentId = [
  param('commentId')
    .isMongoId().withMessage('מזהה תגובה לא תקין'),
    
  handleValidationErrors
];

// Validation למזהה מוצר
export const validateProductId = [
  param('productId')
    .isMongoId().withMessage('מזהה מוצר לא תקין'),
    
  handleValidationErrors
];;