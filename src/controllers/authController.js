import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { cloudinary } from '../config/cloudinary.js';
import { validationResult } from 'express-validator';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isVendor: user.isVendor },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const setCookieToken = (res, token) => {
  // Set JWT in HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
    withCredentials: true
  });
};

// authController.js
export const register = async (req, res) => {
  try {
    // קודם שומרים את המשתמש
    let user = new User({
      email: req.body.email,
      password: req.body.password,
      fullName: req.body.fullName,
    });
    console.log(user)
    await user.save();

    // במקביל מתחילים בהעלאת התמונה
    if (req.file) {
      cloudinary.uploader.upload(req.file.path, {
        folder: 'profile_images',
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      }).then(async result => {
        console.log(result.secure_url);
        user.profileImage = result.secure_url;
        await user.save();
      });
    }

    // מחזירים תשובה מיד
    const token = generateToken(user);
    setCookieToken(res, token);
    res.status(201).json({
      success: true,
      user 
      });

  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration'
     });
  }
};

export const login = async (req, res) => {
  try {
    console.log(req.body)
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials'
       });
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user);
    setCookieToken(res, token);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profileImage: user.profileImage,
        isVendor: user.isVendor
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login'
     });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    let updateData = { ...req.body };
    console.log(userId, updateData);

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'profile_images',
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      });
      updateData.profileImage = result.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון פרטי המשתמש',
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      sameSite: 'strict',
      expires: new Date(0),
      path: '/',
      withCredentials: true
    });
    res.status(200).json({ 
      success: true,
      message: 'Logged out successfully'
     });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const token = generateToken(req.user);
    setCookieToken(res, token);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401)
      .json({ 
        success: false,
        message: 'משתמש לא מחובר' 
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'משתמש לא נמצא' });
    }

    res.json({ 
      success: true,
      user 
    });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאת שרת בקבלת פרטי משתמש' 
    });
  }
};