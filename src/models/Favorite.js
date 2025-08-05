/* needed */
// models/Favorite.js
import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FullProduct',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// אינדקס מורכב למניעת כפילויות
favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);