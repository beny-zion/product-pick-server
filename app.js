// Config imports
import { env, getAllowedOrigins, getRateLimitConfig, isDevelopment, isProduction } from './src/config/environment.js';

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';
import helmet from 'helmet';
import csrf from 'csurf';

// Security Middlewares
import { generalLimiter, authLimiter } from './src/middlewares/rateLimiter.middleware.js';
import { sanitizeInput, mongoSanitizer } from './src/middlewares/sanitizer.middleware.js';

import { connectToMongoDB } from "./src/config/DB.js";
import "./src/config/cloudinary.js";
import { tokenService } from './src/services/aliexpress/token.service.js';
import { configurePassport } from './src/config/passport.js';

// Route imports
import { authRouter } from './src/routes/auth.route.js';
import { analyticsRouter } from './src/routes/analytics.routes.js';
import { vendorRouter } from './src/routes/vendor.routes.js';
import { aliexpressRouter } from './src/routes/aliexpress.routes.js';
import { fullProductRouter } from './src/routes/fullProduct.route.js';
import { favoriteRouter } from './src/routes/favorite.routes.js';
import { commentRouter } from './src/routes/comment.routes.js';
import { vendorQuestionsRouter } from './src/routes/vendor.questions.routes.js';
import { searchRouter } from './src/routes/search.routes.js';

// Initialize app
const app = express();

// אתחול ההתחברות באמצעות גוגל
configurePassport();

// Initialize daily token refresh scheduler
tokenService.initializeTokenRefresh();

// Connect to DB
connectToMongoDB();

// 🆕 Security Middlewares - חייבים להיות לפני כל middleware אחר!
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // נחוץ עבור תמונות מ-AliExpress
}));

// 🆕 Rate limiting כללי - מותאם לסביבה
app.use(generalLimiter);

// Basic Middlewares
app.use(cors({
    optionsSuccessStatus: 200,
    credentials: true,
    origin: getAllowedOrigins() // 🆕 דינמי לפי סביבה
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 🆕 Sanitization middlewares - אחרי parsing
app.use(mongoSanitizer);
app.use(sanitizeInput);

app.use(passport.initialize());

// 🆕 CSRF Protection - מותאם לסביבה
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: env.SECURE_COOKIES, // 🆕 דינמי לפי סביבה
    sameSite: 'strict'
  }
});

// Trust proxy בפרודקשן
if (isProduction()) {
  app.set('trust proxy', 1);
}

// Static files middleware
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'client-build')));

// 🆕 Auth routes עם rate limiting מיוחד - מותאם לסביבה
app.use('/user', authLimiter, authRouter);

// API Routes
app.use('/vendor', vendorRouter);
app.use('/analytics', analyticsRouter);
app.use('/api/aliexpress', aliexpressRouter);
app.use('/full-products', fullProductRouter);
app.use('/favorites', favoriteRouter);
app.use('/comments', commentRouter);
app.use('/vendor', vendorQuestionsRouter);
app.use('/search', searchRouter);

// 🆕 CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 🆕 Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 🆕 Error handling middleware
app.use((err, req, res, next) => {
  // CSRF error handling
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      message: 'פג תוקף האבטחה, יש לרענן את הדף'
    });
  }
  
  // General error handling
  if (env.ENABLE_DEBUG_LOGS) {
    console.error('Error:', err);
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'שגיאת שרת',
    ...(isDevelopment() && { stack: err.stack }) // Stack trace רק בפיתוח
  });
});

// React app - תמיד אחרון!
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client-build', 'index.html'));
});

// Start server
app.listen(env.PORT, () => {
  console.log(`
🔐 Security Features Enabled:
   ✅ Rate Limiting (${env.RATE_LIMIT.MAX_REQUESTS} requests)
   ✅ Input Sanitization
   ✅ CSRF Protection
   ✅ Helmet Security Headers
   ✅ MongoDB Injection Protection
   
🌍 Environment: ${env.NODE_ENV}
🚀 Server running on: ${env.SERVER_URL}
🔗 Client URL: ${env.CLIENT_URL}
${env.NGROK_URL ? `🔗 Ngrok URL: ${env.NGROK_URL}` : ''}
`);
});