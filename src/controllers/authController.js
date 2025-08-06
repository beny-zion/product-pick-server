// /* needed */
/* needed */
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { cloudinary } from '../config/cloudinary.js';
import { Readable } from 'stream';
// 🆕 import הגדרות סביבה
import { env } from '../config/environment.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isVendor: user.isVendor },
    env.JWT_SECRET, // 🆕 שינוי לסביבה
    { expiresIn: '30d' }
  );
};

const setCookieToken = (res, token) => {
  // Set JWT in HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
    sameSite: 'none', // נדרש לצורך עבודה בין דומיינים
    secure: env.SECURE_COOKIES, // 🆕 דינמי לפי סביבה
  });
};

export const googleCallback = async (req, res) => {
  try {
    const token = generateToken(req.user);
    setCookieToken(res, token);
    
    // 🆕 הפניה דינמית לפי סביבה
    res.redirect(env.CLIENT_URL);
  } catch (err) {
    console.error('Google callback error:', err);
    // 🆕 הפניה דינמית בשגיאה
    res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // הדפס רק בפיתוח
    if (env.ENABLE_DEBUG_LOGS) {
      console.log("Body:", req.body);
      console.log("File:", req.file);
    }
    
    let updateData = {};
    
    // עדכן רק את השדות שהתקבלו
    if (req.body.fullName) updateData.fullName = req.body.fullName;
    if (req.body.bio) updateData.bio = req.body.bio;
    
    // טיפול ברשתות חברתיות
    if (req.body['social[instagram]'] || req.body['social[facebook]'] || req.body['social[tiktok]']) {
      updateData.social = {
        instagram: req.body['social[instagram]'] || '',
        facebook: req.body['social[facebook]'] || '',
        tiktok: req.body['social[tiktok]'] || ''
      };
    }

    // טיפול בתמונה עם Memory Storage
    if (req.file) {
      try {
        // יצירת Promise לטיפול עם upload_stream
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'profile_images',
              transformation: [{ width: 400, height: 400, crop: 'fill' }]
            },
            (error, result) => {
              if (error) {
                console.error("❌ Cloudinary upload error:", error);
                reject(error);
              } else {
                if (env.ENABLE_DEBUG_LOGS) {
                  console.log("✅ Image uploaded successfully:", result.secure_url);
                }
                resolve(result);
              }
            }
          );
          
          // יצירת stream מה-buffer (ללא שמירה מקומית!)
          const bufferStream = new Readable();
          bufferStream.push(req.file.buffer);
          bufferStream.push(null);
          bufferStream.pipe(uploadStream);
        });

        updateData.profileImage = result.secure_url;
        
      } catch (uploadError) {
        console.error("❌ Cloudinary upload error:", uploadError);
        // לא נוסיף את התמונה לעדכון במקרה של שגיאה
      }
    }

    if (env.ENABLE_DEBUG_LOGS) {
      console.log("Update data:", updateData);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

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
      sameSite: 'none',  // תואם להתחברות
      secure: env.SECURE_COOKIES, // 🆕 דינמי לפי סביבה
      expires: new Date(0),
      path: '/'
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

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401)
      .json({ 
        success: false,
        message: 'משתמש לא מחובר' 
      });
    }

    const user = await User.findById(req.user.id);
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