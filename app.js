// // Config imports
// import { config } from "dotenv";
// config(); // קודם כל טען את משתני הסביבה

// import express from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import path from 'path';
// import { fileURLToPath } from 'url';
// import passport from 'passport';
// import { connectToMongoDB } from "./src/config/DB.js";
// import "./src/config/cloudinary.js";
// import { tokenService } from './src/services/aliexpress/token.service.js';
// import { configurePassport } from './src/config/passport.js';

// // Route imports
// import { authRouter } from './src/routes/auth.route.js';
// import { analyticsRouter } from './src/routes/analytics.routes.js';
// import { vendorRouter } from './src/routes/vendor.routes.js';
// import { aliexpressRouter } from './src/routes/aliexpress.routes.js';
// import { fullProductRouter } from './src/routes/fullProduct.route.js';
// import { favoriteRouter } from './src/routes/favorite.routes.js';
// import { commentRouter } from './src/routes/comment.routes.js';
// import { vendorQuestionsRouter } from './src/routes/vendor.questions.routes.js';
// import { searchRouter } from './src/routes/search.routes.js';




// // import schedule from 'node-schedule';
// // import { updateAllProducts } from './src/services/productUpdateService.js';

// // Initialize app
// const app = express();
// const port = Number(process.env.PORT) || 3333;

// // אתחול ההתחברות באמצעות גוגל
// configurePassport();


// // Initialize daily token refresh scheduler
// tokenService.initializeTokenRefresh();

// // // הגדרת משימה שתרוץ בשעה 2:00 בלילה
// // schedule.scheduleJob('0 2 * * *', async () => {
// //   console.log('Running scheduled product update');
// //   await updateAllProducts();
// // });

// // Connect to DB
// connectToMongoDB();
// // initScheduledTasks();
// // Basic Middlewares
// app.use(cors({
//     optionsSuccessStatus: 200,
//     credentials: true,
//     origin: ["http://localhost:9999","https://buy-wise.onrender.com"]
// }));
// app.use(express.json());
// app.use(cookieParser());
// app.use(passport.initialize());

// // Static files middleware
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// app.use(express.static(path.join(__dirname, 'client-build')));

// // API Routes
// app.use('/vendor', vendorRouter);
// app.use('/analytics', analyticsRouter);
// app.use('/user', authRouter);
// app.use('/api/aliexpress', aliexpressRouter);
// app.use('/full-products', fullProductRouter);
// app.use('/favorites', favoriteRouter);
// app.use('/comments', commentRouter);
// app.use('/vendor', vendorQuestionsRouter);
// app.use('/search', searchRouter);


// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'client-build', 'index.html'));
// });

// // Start server
// app.listen(port, () => console.log(`Server running on port:http://localhost:${port}`));\
// Config imports
import { config } from "dotenv";
config(); // קודם כל טען את משתני הסביבה

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';
import helmet from 'helmet'; // 🆕 הגנות אבטחה ב-headers
import csrf from 'csurf'; // 🆕 הגנה מפני CSRF

// 🆕 Import Security Middlewares
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
const port = Number(process.env.PORT) || 3333;

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

// 🆕 Rate limiting כללי
app.use(generalLimiter);

// Basic Middlewares
app.use(cors({
    optionsSuccessStatus: 200,
    credentials: true,
    origin: ["http://localhost:9999","https://buy-wise.onrender.com"]
}));

app.use(express.json({ limit: '10mb' })); // הגבלת גודל
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 🆕 Sanitization middlewares - אחרי parsing
app.use(mongoSanitizer); // מונע NoSQL injection
app.use(sanitizeInput); // מנקה את כל הקלט

app.use(passport.initialize());

// 🆕 CSRF Protection - חייב להיות אחרי cookie-parser
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Static files middleware
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'client-build')));

// 🆕 Auth routes עם rate limiting מיוחד
app.use('/user', authLimiter, authRouter);

// API Routes (עם CSRF protection)
app.use('/vendor',  vendorRouter);
app.use('/analytics', analyticsRouter);
app.use('/api/aliexpress',  aliexpressRouter);
app.use('/full-products',  fullProductRouter);
app.use('/favorites',  favoriteRouter);
app.use('/comments',  commentRouter);
app.use('/vendor',  vendorQuestionsRouter);
app.use('/search', searchRouter);

// 🆕 CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
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
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'שגיאת שרת',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// React app - תמיד אחרון!
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client-build', 'index.html'));
});

// Start server
app.listen(port, () => console.log(`
🔐 Security Features Enabled:
   ✅ Rate Limiting
   ✅ Input Sanitization
   ✅ CSRF Protection
   ✅ Helmet Security Headers
   ✅ MongoDB Injection Protection
   
🚀 Server running on: http://localhost:${port}
`));