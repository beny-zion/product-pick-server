// src/middlewares/rateLimiter.middleware.js
import rateLimit from 'express-rate-limit';

/**
 * 🛡️ Rate Limiting - הגנה מפני התקפות DDoS
 * 
 * מה זה עושה?
 * - מגביל כמות בקשות מכל IP
 * - מונע ממשתמש זדוני להציף את השרת
 * - מחזיר שגיאה 429 כשעוברים את הגבול
 */

// הגבלה כללית - 100 בקשות ל-15 דקות
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 100, // מקסימום בקשות
  message: 'יותר מדי בקשות מה-IP הזה, נסה שוב בעוד 15 דקות',
  standardHeaders: true,
  legacyHeaders: false,
});

// הגבלה להתחברות - 5 ניסיונות ל-15 דקות
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'יותר מדי ניסיונות התחברות, נסה שוב מאוחר יותר',
  skipSuccessfulRequests: true, // לא סופר בקשות מוצלחות
});

// הגבלה ליצירת תוכן - 30 פעולות לשעה
export const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // שעה
  max: 30,
  message: 'הגעת למגבלת יצירת תוכן, נסה שוב בעוד שעה',
});

// הגבלה לחיפוש - 60 חיפושים ל-10 דקות
export const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: 'יותר מדי חיפושים, נסה שוב בעוד מספר דקות',
});

// הגבלה ל-API של AliExpress - 20 בקשות לדקה
export const aliexpressLimiter = rateLimit({
  windowMs: 60 * 1000, // דקה
  max: 20,
  message: 'יותר מדי בקשות ל-AliExpress, המתן דקה',
});