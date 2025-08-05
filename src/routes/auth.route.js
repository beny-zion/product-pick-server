/* needed */
// routes/auth.route.js
import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/authController.js';
import { auth } from '../middlewares/middleware.auth.js';
import { upload } from '../middlewares/middleware.upload.js';

const router = express.Router();

// נתיבי אימות Google עם טיפול משופר בשגיאות
router.get('/google', (req, res, next) => {
  console.log('Starting Google OAuth flow');
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    console.log('Google callback received');
    passport.authenticate('google', { 
      session: false,
      failureRedirect: 'http://localhost:9999/login?error=oauth_failed'
    })(req, res, next);
  },
  authController.googleCallback
);

// קבלת משתמש נוכחי
router.get('/current', auth, authController.getCurrentUser);

// התנתקות
router.post('/logout', authController.logout);

// עדכון פרופיל
router.put('/profile', auth, upload.single('profileImage'), authController.updateProfile);

export { router as authRouter };