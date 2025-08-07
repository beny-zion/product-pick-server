// /* needed */
// // routes/aliexpress.routes.js
// import express from 'express';
// import { aliexpressController, validateProduct } from '../controllers/aliexpress.controller.js';
// import { auth } from '../middlewares/middleware.auth.js';

// const router = express.Router();

// // Protected routes
// router.post('/refresh-token', auth, aliexpressController.refreshToken);
// router.get('/token-status', auth, aliexpressController.getTokenStatus);
// router.post('/products/validate', validateProduct);

// export const aliexpressRouter = router;
// ;
// // router.get('/callback', handleCallback);
// // router.get('/products', getProducts);

// routes/aliexpress.routes.js
import express from 'express';
import { 
  aliexpressController, 
  validateProduct, 
  initiateAuth, 
  handleCallback 
} from '../controllers/aliexpress.controller.js';
import { auth } from '../middlewares/middleware.auth.js';

const router = express.Router();

// 🆕 Authentication routes - אלה לא צריכים אימות משתמש!
router.get('/auth', initiateAuth);           // יצירת URL לאימות
router.get('/callback', handleCallback);     // טיפול בתגובה מאלי אקספרס

// Protected routes - אלה דורשים אימות משתמש
router.post('/refresh-token', auth, aliexpressController.refreshToken);
router.get('/token-status', auth, aliexpressController.getTokenStatus);
router.post('/products/validate', validateProduct);

export const aliexpressRouter = router;