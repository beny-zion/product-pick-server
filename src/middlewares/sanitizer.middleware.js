// src/middlewares/sanitizer.middleware.js
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * 🧹 Sanitizer - ניקוי נתונים מקוד זדוני
 * 
 * מה זה עושה?
 * - מנקה HTML מסוכן (מונע XSS)
 * - מסיר תווים מסוכנים ל-MongoDB
 * - מוודא שהנתונים נקיים לפני שמירה
 */

// יצירת DOMPurify instance
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// פונקציה לניקוי טקסט מ-HTML זדוני
export const sanitizeHtml = (dirty) => {
  if (!dirty) return '';
  
  // הגדרות ניקוי - מאפשר רק תגיות בסיסיות
  const clean = purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  });
  
  return clean;
};

// Middleware לניקוי כל הנתונים בבקשה
export const sanitizeInput = (req, res, next) => {
  // ניקוי body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // ניקוי query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // ניקוי params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// פונקציה רקורסיבית לניקוי אובייקט
function sanitizeObject(obj) {
  const cleaned = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // ניקוי מחרוזות
        cleaned[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        // ניקוי מערכים
        cleaned[key] = value.map(item => 
          typeof item === 'object' ? sanitizeObject(item) : sanitizeString(item)
        );
      } else if (typeof value === 'object' && value !== null) {
        // ניקוי אובייקטים מקוננים
        cleaned[key] = sanitizeObject(value);
      } else {
        // העתקת ערכים אחרים כמו שהם
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
}

// ניקוי מחרוזת בודדת
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // הסרת תווים מסוכנים ל-MongoDB
  let cleaned = str.replace(/[$]/g, '');
  
  // הסרת תגיות script ו-style
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  return cleaned.trim();
}

// Middleware של express-mongo-sanitize
export const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ ניסיון לשלוח נתונים מסוכנים: ${key}`);
  }
});