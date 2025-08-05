// src/middlewares/checkOwnership.middleware.js
import FullProduct from '../models/FullProduct.js';
import Comment from '../models/Comment.js';
import Favorite from '../models/Favorite.js';

/**
 * 🔐 Ownership Checker - בדיקת בעלות על משאבים
 * 
 * מה זה עושה?
 * - מוודא שמשתמש יכול לערוך/למחוק רק את התוכן שלו
 * - מונע ממשתמשים לשנות תוכן של אחרים
 * - מחזיר 403 (Forbidden) אם אין הרשאה
 */

// בדיקת בעלות על מוצר
export const checkProductOwnership = async (req, res, next) => {
  try {
    const productId = req.params.id || req.params.productId;
    const userId = req.user._id;
    
    // חיפוש המוצר
    const product = await FullProduct.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'מוצר לא נמצא'
      });
    }
    
    // בדיקת בעלות
    if (product.vendorId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'אין לך הרשאה לבצע פעולה זו על המוצר'
      });
    }
    
    // שמירת המוצר ב-request להמשך
    req.product = product;
    next();
  } catch (error) {
    console.error('Error checking product ownership:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת הרשאות'
    });
  }
};

// בדיקת בעלות על תגובה
export const checkCommentOwnership = async (req, res, next) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user._id;
    
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'תגובה לא נמצאה'
      });
    }
    
    // בדיקה שהתגובה פעילה
    if (comment.status !== 'ACTIVE') {
      return res.status(404).json({
        success: false,
        message: 'תגובה לא נמצאה'
      });
    }
    
    // בדיקת בעלות
    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'אין לך הרשאה לבצע פעולה זו על התגובה'
      });
    }
    
    req.comment = comment;
    next();
  } catch (error) {
    console.error('Error checking comment ownership:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת הרשאות'
    });
  }
};

// בדיקת בעלות על מועדף
export const checkFavoriteOwnership = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const userId = req.user._id;
    
    const favorite = await Favorite.findOne({
      productId,
      userId
    });
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'מוצר לא נמצא במועדפים'
      });
    }
    
    req.favorite = favorite;
    next();
  } catch (error) {
    console.error('Error checking favorite ownership:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת הרשאות'
    });
  }
};

// בדיקה כללית אם המשתמש הוא מוכר
export const checkIsVendor = (req, res, next) => {
  if (!req.user.isVendor) {
    return res.status(403).json({
      success: false,
      message: 'פעולה זו מיועדת למוכרים בלבד'
    });
  }
  next();
};