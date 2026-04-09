// /* needed */
// import jwt from 'jsonwebtoken';
// import User from '../models/User.js';


// export const auth = async (req, res, next) => {
//   try {
//     const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
//     if (!token) throw new Error('No token provided');
    
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id);
//     // console.log("user",user)  
//     if (!user) throw new Error('User not found');

//     req.user = user;
//     req.token = token;
//     next();
//   } catch (err) {
//     res.status(401).json({ message: 'Authentication required' });
//   }
// };
// export const vendorAuth = (req, res, next) => {
//   if (!req.user.isVendor) {
//     return res.status(403).json({ message: 'Vendor access required' });
//   }
//   next();
// };
// middlewares/middleware.auth.js - עם הדפסות debug מפורטות
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  console.log('🔐 [auth middleware] Starting authentication check...');
  console.log('🔐 [auth middleware] Request path:', req.path);
  console.log('🔐 [auth middleware] Request method:', req.method);
  
  try {
    // בדיקת טוקן מ-cookies או headers
    const cookieToken = req.cookies.token;
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;
    
    console.log('🔐 [auth middleware] Token sources:', {
      hasCookieToken: !!cookieToken,
      hasHeaderToken: !!headerToken,
      finalToken: !!token,
      tokenLength: token?.length
    });
    
    if (!token) {
      console.log('❌ [auth middleware] No token provided');
      throw new Error('No token provided');
    }
    
    console.log('🔐 [auth middleware] Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 [auth middleware] JWT decoded successfully:', {
      userId: decoded.id,
      isVendor: decoded.isVendor,
      exp: new Date(decoded.exp * 1000).toISOString()
    });
    
    console.log('🔐 [auth middleware] Looking up user in database...');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('❌ [auth middleware] User not found in database for ID:', decoded.id);
      throw new Error('User not found');
    }
    
    console.log('✅ [auth middleware] User found and authenticated:', {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      isVendor: user.isVendor
    });

    req.user = user;
    req.token = token;
    
    console.log('🔐 [auth middleware] Proceeding to next middleware/controller...');
    next();
  } catch (err) {
    console.log('❌ [auth middleware] Authentication failed:', {
      error: err.message,
      name: err.name,
      isJWTError: err.name?.includes('JsonWebToken')
    });
    
    res.status(401).json({ 
      success: false,
      message: 'Authentication required',
      error: err.message 
    });
  }
};

export const vendorAuth = (req, res, next) => {
  console.log('🏪 [vendorAuth middleware] Checking vendor status...');
  console.log('🏪 [vendorAuth middleware] User isVendor:', req.user?.isVendor);
  
  if (!req.user.isVendor) {
    console.log('❌ [vendorAuth middleware] User is not a vendor');
    return res.status(403).json({ 
      success: false,
      message: 'Vendor access required' 
    });
  }
  
  console.log('✅ [vendorAuth middleware] Vendor access granted');
  next();
};

// Auth middleware שלא דורש אימות - רק מנסה לטעון משתמש אם יש טוקן
export const optionalAuth = async (req, res, next) => {
  console.log('🔓 [optionalAuth middleware] Starting optional authentication check...');
  
  try {
    const cookieToken = req.cookies.token;
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;
    
    console.log('🔓 [optionalAuth middleware] Token found:', !!token);
    
    if (!token) {
      console.log('🔓 [optionalAuth middleware] No token - proceeding without user');
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user) {
      console.log('✅ [optionalAuth middleware] User loaded:', {
        userId: user._id,
        email: user.email
      });
      req.user = user;
      req.token = token;
    } else {
      console.log('⚠️ [optionalAuth middleware] Token valid but user not found');
    }
    
  } catch (err) {
    console.log('⚠️ [optionalAuth middleware] Token invalid, proceeding without user:', err.message);
  }
  
  next();
};