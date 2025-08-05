// /* needed */
// // src/routes/search.routes.js
// import express from 'express';
// import { searchController } from '../controllers/search.controller.js';
// import { auth_id } from '../middlewares/middleware.auth.id.js';

// const router = express.Router();

// // חיפוש מוצרים - פתוח לכולם, אבל עם אפשרות לזהות משתמש
// router.get('/', auth_id, searchController.searchProducts);

// // הצעות חיפוש
// router.get('/suggestions', searchController.getSuggestions);

// // נתוני פילטרים
// router.get('/categories', searchController.getDynamicCategories);
// router.get('/vendors', searchController.getVendors);
// router.get('/price-range', searchController.getPriceRange);

// // endpoint משולב לכל נתוני החיפוש
// router.get('/data', searchController.getSearchData);



// export { router as searchRouter };
// src/routes/search.routes.js
import express from 'express';
import { searchController } from '../controllers/search.controller.js';
import { auth_id } from '../middlewares/middleware.auth.id.js';

const router = express.Router();

// 🔧 Middleware לנרמול פרמטרי query
const normalizeQueryParams = (req, res, next) => {
  // המרת פרמטרים בפורמט array[] לפורמט רגיל
  const query = req.query;
  const normalizedQuery = {};
  
  for (const key in query) { 
    // אם המפתח מסתיים ב-[]
    if (key.endsWith('[]')) {
      const normalizedKey = key.slice(0, -2); // הסרת ה-[]
      normalizedQuery[normalizedKey] = query[key];
    } else {
      normalizedQuery[key] = query[key];
    }
  }
  
  // החלפת req.query עם הגרסה המנורמלת
  req.query = { ...query, ...normalizedQuery };
  
  console.log('📋 Query params normalized:', req.query);
  next();
};

// חיפוש מוצרים - פתוח לכולם, אבל עם אפשרות לזהות משתמש
router.get('/', auth_id, normalizeQueryParams, searchController.searchProducts);

// הצעות חיפוש
router.get('/suggestions', searchController.getSuggestions);

// נתוני פילטרים
router.get('/categories', searchController.getDynamicCategories);
router.get('/vendors', searchController.getVendors);
router.get('/price-range', searchController.getPriceRange);

// endpoint משולב לכל נתוני החיפוש
router.get('/data', searchController.getSearchData);

export { router as searchRouter };