/**
 * Admin middleware — checks user.role === 'admin'
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'נדרשת התחברות' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'גישה מוגבלת למנהלים בלבד' });
  }

  next();
};
