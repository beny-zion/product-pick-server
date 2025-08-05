/* needed */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';


export const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    // console.log("user",user)  
    if (!user) throw new Error('User not found');

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Authentication required' });
  }
};
export const vendorAuth = (req, res, next) => {
  if (!req.user.isVendor) {
    return res.status(403).json({ message: 'Vendor access required' });
  }
  next();
};