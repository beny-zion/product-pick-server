import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required only if not using Google auth
    },
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: '' // Default profile image URL
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isVendor: {
    type: Boolean,
    default: true // Default to vendor account
  },
  productsLimit: {
    type: Number,
    default: 10 // Default limit for free tier
  },
  social: {
    instagram: String,
    facebook: String,
    tiktok: String
  },
  googleId: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;