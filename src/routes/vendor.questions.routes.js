/* needed */
// src/routes/vendor.questions.routes.js
import express from 'express';
import { auth } from '../middlewares/middleware.auth.js';
import { vendorAuth } from '../middlewares/middleware.auth.js';
import { VendorQuestionsController } from '../controllers/vendor.questions.controller.js';

const router = express.Router();

// כל הנתיבים דורשים אימות מוכר
router.use(auth, vendorAuth);

// שאלות
router.get('/questions', VendorQuestionsController.getVendorQuestions);
router.post('/questions/:questionId/reply', VendorQuestionsController.replyToQuestion);

// התראות
router.get('/notifications', VendorQuestionsController.getNotifications);
router.put('/notifications/:notificationId/read', VendorQuestionsController.markNotificationAsRead);
router.put('/notifications/read-all', VendorQuestionsController.markAllNotificationsAsRead);

export { router as vendorQuestionsRouter };