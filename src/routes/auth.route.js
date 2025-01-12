import express from 'express';
import { check } from 'express-validator';
import * as authController from '../controllers/authController.js';
import passport from 'passport';
import { upload } from '../middlewares/middleware.upload.js';
import { auth } from '../middlewares/middleware.auth.js';


const router = express.Router();

const registerValidation = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  check('fullName', 'Full name is required').not().isEmpty()
];

router.post('/register',upload.single('profileImage'),registerValidation,authController.register);

router.post('/login', authController.login);

router.put('/profile', auth, upload.single('profileImage'), authController.updateProfile);

router.get('/google',passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',passport.authenticate('google', { session: false }),authController.googleCallback);

router.get('/current', auth, authController.getCurrentUser);

router.post('/logout', authController.logout);

export { router as authRouter };