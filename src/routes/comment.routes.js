// /* needed */
// // routes/comment.routes.js
// import express from 'express';
// import { auth } from '../middlewares/middleware.auth.js';
// import { auth_id } from '../middlewares/middleware.auth.id.js';
// import { commentController } from '../controllers/commentController.js';

// const router = express.Router();

// // נתיבי תגובות - חלקם מוגנים וחלקם פתוחים לקריאה
// router.post('/', auth, commentController.createComment);
// router.get('/product/:productId', commentController.getProductComments);
// router.get('/:commentId/replies', commentController.getCommentReplies);
// router.post('/:commentId/like', auth, commentController.toggleCommentLike);
// router.put('/:commentId', auth, commentController.updateComment);
// router.delete('/:commentId', auth, commentController.deleteComment);
// router.get('/product/:productId/stats', commentController.getCommentStats);

// export { router as commentRouter };
// routes/comment.routes.js
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { auth_id } from '../middlewares/middleware.auth.id.js';
import { commentController } from '../controllers/commentController.js';
import { checkCommentOwnership } from '../middlewares/checkOwnership.middleware.js'; // 🆕
import { createContentLimiter } from '../middlewares/rateLimiter.middleware.js'; // 🆕
import { // 🆕 Validators
  validateCreateComment,
  validateUpdateComment,
  validateCommentId,
  validateProductId
} from '../validators/comment.validator.js';

const router = express.Router();

// יצירת תגובה - עם validation ו-rate limiting 🆕
router.post('/', 
  auth, 
  createContentLimiter, // 🆕 הגבלת כמות תגובות
  validateCreateComment, // 🆕 בדיקת תקינות
  commentController.createComment
);

// קבלת תגובות למוצר - עם validation 🆕
router.get('/product/:productId', 
  validateProductId, // 🆕
  commentController.getProductComments
);

// קבלת תגובות מקוננות - עם validation 🆕
router.get('/:commentId/replies', 
  validateCommentId, // 🆕
  commentController.getCommentReplies
);

// לייק - עם validation 🆕
router.post('/:commentId/like', 
  auth, 
  validateCommentId, // 🆕
  commentController.toggleCommentLike
);

// עדכון תגובה - עם בדיקת בעלות ו-validation 🆕
router.put('/:commentId', 
  auth, 
  validateUpdateComment, // 🆕
  checkCommentOwnership, // 🆕 בדיקת בעלות
  commentController.updateComment
);

// מחיקת תגובה - עם בדיקת בעלות 🆕
router.delete('/:commentId', 
  auth, 
  validateCommentId, // 🆕
  checkCommentOwnership, // 🆕 בדיקת בעלות
  commentController.deleteComment
);

// סטטיסטיקות - עם validation 🆕
router.get('/product/:productId/stats', 
  validateProductId, // 🆕
  commentController.getCommentStats
);

export { router as commentRouter };