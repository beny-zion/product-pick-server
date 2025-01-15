import mongoose from 'mongoose';

const categoryInterestSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  }
});

const searchSchema = new mongoose.Schema({
  query: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const userInterestsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  categories: [categoryInterestSchema],
  recentSearches: {
    type: [searchSchema],
    default: [],
    validate: [arr => arr.length <= 10, 'Too many recent searches']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// אינדקסים לביצועים
// userInterestsSchema.index({ userId: 1 });
userInterestsSchema.index({ 'categories.categoryId': 1 });

export default mongoose.model('UserInterests', userInterestsSchema);