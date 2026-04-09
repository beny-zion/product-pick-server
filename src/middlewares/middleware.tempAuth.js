import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export const tempAuth = async (req, res, next) => {
  try {
    console.log("tempAuth middleware invoked!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    console.log("tempAuth middleware invoked");
    console.log("token received:", token);
    if (!token) {
      // אם אין טוקן, מחפש את המשתמש לפי ID קבוע
      const user = await User.findById('67dc87c70af4c7e5529c26c5');
      if (!user) throw new Error('Default user not found');
      
      // יצירת טוקן זמני
      const tempToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log("tempToken.................................",tempToken)
      req.user = user;
      req.token = tempToken;
      next();
    } else {
        console.log("token exists, proceeding with normal auth");
      // אם יש טוקן, ממשיך כרגיל
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      console.log("user............//////.",user)
      if (!user) throw new Error('User not found');

      req.user = user;
      req.token = token;
      next();
    }
  } catch (err) {
    res.status(401).json({ message: 'Authentication failed: ' + err.message });
  }
};