/* needed */
// src/config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { config } from "dotenv";
config();

export const configurePassport = () => {
  
  // Google Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3333/user/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // קודם בדיקה לפי Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      // אם לא נמצא לפי Google ID, בדוק לפי אימייל
      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // אם נמצא משתמש קיים עם אותו אימייל, עדכן אותו עם ה-Google ID
          user.googleId = profile.id;
          if (!user.profileImage && profile.photos && profile.photos[0]) {
            user.profileImage = profile.photos[0].value;
          }
        } else {
          // אם לא קיים בכלל - צור משתמש חדש
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            fullName: profile.displayName,
            profileImage: profile.photos[0].value,
            isVendor: true
          });
        }
        
        // שמור את השינויים
        await user.save();
      }
      
      // עדכן את זמן הכניסה האחרון
      user.lastLogin = new Date();
      await user.save();
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};