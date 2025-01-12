import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { auth } from '../middlewares/middleware.auth.js';

const router = express.Router();

// נתיבים פתוחים
router.get('/active', categoryController.getActiveCategories);

router.get('/', categoryController.getMainCategories);
router.get('/:parentId/sub', categoryController.getSubCategories);

// נתיבים למנהל מערכת בלבד
router.post('/', auth, categoryController.addCategory);

export { router as categoryRouter };