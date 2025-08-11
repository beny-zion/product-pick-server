// src/middlewares/sanitizer.middleware.js - גרסה מתוקנת
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * 🧹 Sanitizer - ניקוי נתונים מקוד זדוני
 * גרסה מתוקנת - פחות נוקשה לפיתוח
 */

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// 🔧 פונקציה מתוקנת - מאפשרת יותר תוכן
export const sanitizeHtml = (dirty) => {
  if (!dirty) return '';
  
  // 🔧 הגדרות ניקוי מקלות יותר
  const clean = purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span', 'div', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
  });
  
  return clean;
};

// 🔧 Middleware מתוקן - פחות נוקשה
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

// 🔧 פונקציה רקורסיבית מתוקנת
function sanitizeObject(obj) {
  const cleaned = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // 🔧 ניקוי מחרוזות מקל יותר
        cleaned[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map(item => 
          typeof item === 'object' ? sanitizeObject(item) : 
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = sanitizeObject(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
}

// 🔧 ניקוי מחרוזת מתוקן - פחות נוקשה
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // 🔧 הסרת תווים מסוכנים ל-MongoDB בלבד
  let cleaned = str.replace(/\$where/gi, '').replace(/\$eval/gi, '');
  
  // 🔧 הסרת תגיות script מסוכנות בלבד
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=/gi, ''); // onclick, onload וכו'
  
  // 🔧 לא עושים trim אוטומטי - יכול להסיר רווחים חשובים
  return cleaned;
}

// 🔧 Middleware מתוקן של express-mongo-sanitize
export const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    // 🔧 לוג רק בפיתוח
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ ניסיון לשלוח נתונים מסוכנים: ${key}`);
    }
  }
});