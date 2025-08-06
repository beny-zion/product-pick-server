// src/config/environment.js
import { config } from "dotenv";
import path from 'path';

/**
 * 🌍 Environment Configuration Manager
 * 
 * מטרה: ניהול מרכזי של משתני סביבה לפיתוח ופרודקשן
 * תכונות: טעינה אוטומטית של קובץ .env הנכון, validation, פונקציות עזר
 */

// זיהוי הסביבה הנוכחית
const environment = process.env.NODE_ENV || 'development';

// טעינת קובץ הסביבה המתאים
const loadEnvironment = () => {
  const envFile = `.env.${environment}`;
  
  console.log(`🌍 Loading environment: ${environment}`);
  console.log(`📄 Environment file: ${envFile}`);
  
  // נסה לטעון את קובץ הסביבה הספציפי
  const result = config({ path: envFile });
  
  if (result.error) {
    console.log(`⚠️  ${envFile} not found, trying .env`);
    // אם לא נמצא, נסה לטעון .env כללי
    config();
  } else {
    console.log(`✅ Successfully loaded ${envFile}`);
  }
};

// טען את הסביבה
loadEnvironment();

/**
 * 🔧 הגדרות סביבה מרכזיות
 */
export const env = {
  // Environment info
  NODE_ENV: environment,
  IS_DEVELOPMENT: environment === 'development',
  IS_PRODUCTION: environment === 'production',
  IS_TEST: environment === 'test',
  
  // Server configuration
  PORT: Number(process.env.PORT) || 3333,
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3333',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:9999',
  
  // Database
  MONGO_CONNECTION: process.env.MONGO_CONNECTION,
  
  // Cloudinary
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET,
  },
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  
  // External APIs
  ALIEXPRESS: {
    APP_KEY: process.env.ALIEXPRESS_APP_KEY,
    APP_SECRET: process.env.ALIEXPRESS_APP_SECRET,
  },
  
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },
  
  // Development specific
  NGROK_URL: process.env.NGROK_URL,
  
  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL || (environment === 'production' ? 'error' : 'debug'),
  ENABLE_DEBUG_LOGS: process.env.ENABLE_DEBUG_LOGS === 'true' || environment === 'development',
  ENABLE_REQUEST_LOGS: process.env.ENABLE_REQUEST_LOGS === 'true' || environment === 'development',
  
  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || (environment === 'production' ? 100 : 200),
    AUTH_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX) || (environment === 'production' ? 10 : 20),
  },
  
  // Security settings
  SECURE_COOKIES: process.env.SECURE_COOKIES === 'true' || environment === 'production',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || environment === 'production',
};

/**
 * 🎯 פונקציות עזר לסביבה
 */

// בדיקות סביבה
export const isDevelopment = () => env.IS_DEVELOPMENT;
export const isProduction = () => env.IS_PRODUCTION;
export const isTest = () => env.IS_TEST;

// קבלת URL השרת (עם תמיכה ב-ngrok לפיתוח)
export const getServerUrl = () => {
  if (isDevelopment() && env.NGROK_URL) {
    return env.NGROK_URL;
  }
  return env.SERVER_URL;
};

// קבלת כתובות CORS מותרות
export const getAllowedOrigins = () => {
  const origins = [env.CLIENT_URL];
  
  if (isDevelopment()) {
    origins.push('http://localhost:9999');
    origins.push('http://localhost:3000');
    origins.push('http://localhost:5173'); // Vite default
    if (env.NGROK_URL) {
      origins.push(env.NGROK_URL);
    }
  }
  
  if (isProduction()) {
    origins.push('https://buy-wise.onrender.com');
  }
  
  return [...new Set(origins)]; // הסרת כפילויות
};

// קבלת הגדרות rate limiting לפי סביבה
export const getRateLimitConfig = (type = 'general') => {
  const baseConfig = {
    windowMs: env.RATE_LIMIT.WINDOW_MS,
    standardHeaders: true,
    legacyHeaders: false,
  };
  
  switch (type) {
    case 'auth':
      return {
        ...baseConfig,
        max: env.RATE_LIMIT.AUTH_MAX,
        message: 'יותר מדי ניסיונות התחברות, נסה שוב מאוחר יותר',
      };
    case 'general':
    default:
      return {
        ...baseConfig,
        max: env.RATE_LIMIT.MAX_REQUESTS,
        message: 'יותר מדי בקשות, נסה שוב מאוחר יותר',
      };
  }
};

/**
 * 🔍 בדיקת תקינות משתני סביבה חיוניים
 */
export const validateEnvironment = () => {
  const requiredVars = [
    'MONGO_CONNECTION',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];
  
  // בדיקת משתנים חיוניים
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    
    if (isProduction()) {
      console.error('🚨 Production mode - server cannot start with missing variables');
      process.exit(1); // עצור את השרת בפרודקשן
    } else {
      console.warn('⚠️  Development mode - continuing with missing variables (not recommended)');
    }
  }
  
  // בדיקת חוזק סיסמאות בפרודקשן
  if (isProduction()) {
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      console.warn('⚠️  JWT_SECRET should be at least 32 characters in production');
    }
    if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
      console.warn('⚠️  SESSION_SECRET should be at least 32 characters in production');
    }
  }
  
  console.log('✅ Environment validation completed');
  return true;
};

/**
 * 📊 הדפסת סיכום הגדרות (ללא ערכים רגישים)
 */
export const logEnvironmentSummary = () => {
  if (!env.ENABLE_DEBUG_LOGS) return;
  
  console.log('\n🔧 Environment Configuration Summary:');
  console.log('┌─────────────────────────────────────┐');
  console.log(`│ Environment: ${env.NODE_ENV.padEnd(20)} │`);
  console.log(`│ Server URL:  ${env.SERVER_URL.substring(0, 20).padEnd(20)} │`);
  console.log(`│ Client URL:  ${env.CLIENT_URL.substring(0, 20).padEnd(20)} │`);
  console.log(`│ Log Level:   ${env.LOG_LEVEL.padEnd(20)} │`);
  console.log(`│ Debug Logs:  ${env.ENABLE_DEBUG_LOGS.toString().padEnd(20)} │`);
  console.log(`│ Rate Limit:  ${env.RATE_LIMIT.MAX_REQUESTS.toString().padEnd(20)} │`);
  console.log('└─────────────────────────────────────┘\n');
};

// הפעל validation וסיכום בעת טעינת המודול
validateEnvironment();
logEnvironmentSummary();

// Export default של כל הקובץ
export default env;