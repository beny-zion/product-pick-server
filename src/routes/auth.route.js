// /* needed */
// // routes/auth.route.js
// import express from 'express';
// import passport from 'passport';
// import * as authController from '../controllers/authController.js';
// import { auth } from '../middlewares/middleware.auth.js';
// import { upload } from '../middlewares/middleware.upload.js';

// const router = express.Router();

// // נתיבי אימות Google עם טיפול משופר בשגיאות
// router.get('/google', (req, res, next) => {
//   console.log('Starting Google OAuth flow');
//   passport.authenticate('google', { 
//     scope: ['profile', 'email'],
//     accessType: 'offline',
//     prompt: 'consent'
//   })(req, res, next);
// });

// router.get('/google/callback',
//   (req, res, next) => {
//     console.log('Google callback received');
//     passport.authenticate('google', { 
//       session: false,
//       failureRedirect: 'http://localhost:9999/login?error=oauth_failed'
//     })(req, res, next);
//   },
//   authController.googleCallback
// );

// // קבלת משתמש נוכחי
// router.get('/current', auth, authController.getCurrentUser);

// // התנתקות
// router.post('/logout', authController.logout);

// // עדכון פרופיל
// router.put('/profile', auth, upload.single('profileImage'), authController.updateProfile);

// export { router as authRouter };
/* needed */
// // routes/auth.route.js
// import express from 'express';
// import passport from 'passport';
// import * as authController from '../controllers/authController.js';
// import { auth } from '../middlewares/middleware.auth.js';
// import { upload } from '../middlewares/middleware.upload.js';
// // 🆕 import הגדרות סביבה
// import { env } from '../config/environment.js';

// const router = express.Router();

// // נתיבי אימות Google עם טיפול משופר בשגיאות
// router.get('/google', (req, res, next) => {
//   if (env.ENABLE_DEBUG_LOGS) {
//     console.log('Starting Google OAuth flow');
//   }
//   passport.authenticate('google', { 
//     scope: ['profile', 'email'],
//     accessType: 'offline',
//     prompt: 'consent'
//   })(req, res, next);
// });

// router.get('/google/callback',
//   (req, res, next) => {
//     if (env.ENABLE_DEBUG_LOGS) {
//       console.log('Google callback received');
//     }
//     passport.authenticate('google', { 
//       session: false,
//       // 🆕 failureRedirect דינמי לפי סביבה
//       failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed`
//     })(req, res, next);
//   },
//   authController.googleCallback
// );

// // קבלת משתמש נוכחי
// router.get('/current', auth, authController.getCurrentUser);

// // התנתקות
// router.post('/logout', authController.logout);

// // עדכון פרופיל
// router.put('/profile', auth, upload.single('profileImage'), authController.updateProfile);

// export { router as authRouter };
// routes/auth.route.js - עם הדפסות debug מפורטות
import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/authController.js';
import { auth } from '../middlewares/middleware.auth.js';
import { upload } from '../middlewares/middleware.upload.js';
import { env } from '../config/environment.js';

const router = express.Router();

// Middleware לוגים לכל הבקשות
router.use((req, res, next) => {
  console.log(`🛣️ [auth.route] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  console.log(`🛣️ [auth.route] Headers:`, {
    'user-agent': req.headers['user-agent']?.substring(0, 50),
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer ***' : 'none',
    'cookie': req.headers.cookie ? 'exists' : 'none'
  });
  next();
});

// נתיבי אימות Google עם טיפול משופר בשגיאות
router.get('/google', (req, res, next) => {
  console.log('🔑 [auth.route] Starting Google OAuth flow');
  console.log('🔑 [auth.route] Google Client ID exists:', !!env.GOOGLE.CLIENT_ID);
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    console.log('🔑 [auth.route] Google callback received');
    console.log('🔑 [auth.route] Query params:', req.query);
    
    passport.authenticate('google', { 
      session: false,
      failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed`
    })(req, res, next);
  },
  authController.googleCallback
);

// קבלת משתמש נוכחי - עם debug מפורט
router.get('/current', (req, res, next) => {
  console.log('👤 [auth.route] /current endpoint called');
  console.log('👤 [auth.route] Cookies received:', {
    hasToken: !!req.cookies.token,
    tokenLength: req.cookies.token?.length,
    allCookies: Object.keys(req.cookies)
  });
  console.log('👤 [auth.route] Authorization header:', req.headers.authorization ? 'present' : 'none');
  
  // המשך ל-auth middleware
  next();
}, auth, authController.getCurrentUser);

// התנתקות
router.post('/logout', (req, res, next) => {
  console.log('🚪 [auth.route] /logout endpoint called');
  next();
}, authController.logout);

// עדכון פרופיל
router.put('/profile', (req, res, next) => {
  console.log('📝 [auth.route] /profile endpoint called');
  console.log('📝 [auth.route] Content-Type:', req.headers['content-type']);
  next();
}, auth, upload.single('profileImage'), authController.updateProfile);

// Error handler ספציפי לרואט הזה
router.use((error, req, res, next) => {
  console.error('❌ [auth.route] Route error:', {
    message: error.message,
    stack: error.stack?.split('\n')[0],
    path: req.path,
    method: req.method
  });
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Authentication route error'
  });
});

export { router as authRouter };