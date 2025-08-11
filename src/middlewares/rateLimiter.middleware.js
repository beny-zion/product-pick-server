// src/middlewares/rateLimiter.middleware.js - מתוקן לפיתוח
import rateLimit from 'express-rate-limit';
import { env, isDevelopment } from '../config/environment.js';

/**
 * 🛡️ Rate Limiting - הגנה מפני התקפות DDoS
 * מותאם לסביבת פיתוח עם הגבלות מקלות יותר
 */

// 🔧 הגבלה כללית - יותר מקלה בפיתוח
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: isDevelopment() ? 1000 : 200, // 🔧 1000 בפיתוח, 200 בפרודקשן
  message: 'יותר מדי בקשות מה-IP הזה, נסה שוב בעוד 15 דקות',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 🔧 דילוג על localhost בפיתוח
    if (isDevelopment() && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  }
});

// 🔧 הגבלה להתחברות - יותר מקלה בפיתוח
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment() ? 50 : 5, // 🔧 50 בפיתוח, 5 בפרודקשן
  message: 'יותר מדי ניסיונות התחברות, נסה שוב מאוחר יותר',
  skipSuccessfulRequests: true,
  skip: (req) => {
    if (isDevelopment() && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  }
});

// 🔧 הגבלה ליצירת תוכן - יותר מקלה בפיתוח
export const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // שעה
  max: isDevelopment() ? 200 : 30, // 🔧 200 בפיתוח, 30 בפרודקשן
  message: 'הגעת למגבלת יצירת תוכן, נסה שוב בעוד שעה',
  skip: (req) => {
    if (isDevelopment() && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  }
});

// 🔧 הגבלה לחיפוש - יותר מקלה בפיתוח
export const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDevelopment() ? 300 : 60, // 🔧 300 בפיתוח, 60 בפרודקשן
  message: 'יותר מדי חיפושים, נסה שוב בעוד מספר דקות',
  skip: (req) => {
    if (isDevelopment() && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  }
});

// 🔧 הגבלה ל-API של AliExpress - יותר מקלה בפיתוח
export const aliexpressLimiter = rateLimit({
  windowMs: 60 * 1000, // דקה
  max: isDevelopment() ? 100 : 20, // 🔧 100 בפיתוח, 20 בפרודקשן
  message: 'יותר מדי בקשות ל-AliExpress, המתן דקה',
  skip: (req) => {
    if (isDevelopment() && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  }
});