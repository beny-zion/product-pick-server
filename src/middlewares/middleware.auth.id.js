/* needed */
// middlewares/middleware.auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth_id = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    // אם אין טוקן, פשוט נמשיך הלאה
    if (!token) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        req.token = token;
      }
    } catch (err) {
      // אם יש בעיה עם הטוקן, פשוט נמשיך בלי user
      console.log('Token verification failed:', err.message);
    }
    
    next();
  } catch (err) {
    next(err);
  }
};