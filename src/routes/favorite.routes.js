/* needed */
// routes/favorite.routes.js
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { auth_id } from '../middlewares/middleware.auth.id.js';
import { 
  addFavorite, 
  removeFavorite, 
  getFavorites,
  checkFavoriteStatus
} from '../controllers/favoriteController.js';

const router = express.Router();

// הוספת מוצר למועדפים - דורש אימות
router.post('/', auth, addFavorite);

// הסרת מוצר מהמועדפים - דורש אימות
router.delete('/:productId', auth, removeFavorite);

// קבלת רשימת מוצרים מועדפים - דורש אימות
router.get('/', auth, getFavorites);

// בדיקה אם מוצר נמצא במועדפים - אופציונלי לאימות
router.get('/status/:productId', auth_id, checkFavoriteStatus);

export { router as favoriteRouter };