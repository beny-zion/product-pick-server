import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import {
  getPlans,
  getMySubscription,
  initiateUpgrade,
  handlePaymentSuccess,
  handlePaymentError,
  handlePaymentCancel,
  cancelSubscription,
  reactivateSubscription,
  demoUpgrade,
} from '../controllers/subscription.controller.js';

const router = express.Router();

// Public
router.get('/plans', getPlans);

// HYP callbacks (no auth — called by HYP redirect)
router.get('/payment/success', handlePaymentSuccess);
router.get('/payment/error', handlePaymentError);
router.get('/payment/cancel', handlePaymentCancel);

// Authenticated
router.get('/my', auth, getMySubscription);
router.post('/upgrade', auth, initiateUpgrade);
router.post('/cancel', auth, cancelSubscription);
router.post('/reactivate', auth, reactivateSubscription);
router.post('/demo-upgrade', auth, demoUpgrade);

export const subscriptionRouter = router;
