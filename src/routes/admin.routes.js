import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import {
  getDashboardStats,
  getUsers,
  getUserDetails,
  updateUserPlan,
  getProducts,
  toggleProductStatus,
  getPayments,
  getSubscriptionStats,
} from '../controllers/admin.controller.js';

const router = express.Router();

// All routes require auth + admin
router.use(auth, requireAdmin);

// Dashboard
router.get('/stats', getDashboardStats);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id/plan', updateUserPlan);

// Products
router.get('/products', getProducts);
router.put('/products/:id/status', toggleProductStatus);

// Payments
router.get('/payments', getPayments);

// Subscription stats
router.get('/subscriptions/stats', getSubscriptionStats);

export const adminRouter = router;
