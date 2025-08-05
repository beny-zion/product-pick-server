/* needed */
// models/Comment.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FullProduct',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxLength: 1000
  },
  // עבור תגובות מקוננות
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  // עבור ציטוטים
  quotedComment: {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    },
    content: String,
    userName: String
  },
  // סוג התגובה
  commentType: {
    type: String,
    enum: ['QUESTION', 'OPINION', 'GENERAL'],
    default: 'GENERAL'
  },
  // לייקים
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  // מספר תגובות מקוננות
  replyCount: {
    type: Number,
    default: 0
  },
  // סטטוס התגובה
  status: {
    type: String,
    enum: ['ACTIVE', 'HIDDEN', 'DELETED'],
    default: 'ACTIVE'
  },
  // האם המוכר ענה לתגובה
  vendorReplied: {
    type: Boolean,
    default: false
  },
  // דירוג התגובה (עזר למיון)
  score: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// אינדקסים לביצועים
commentSchema.index({ productId: 1, parentCommentId: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ score: -1 });

// וירטואל לקבלת מספר הלייקים
commentSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// מתודה לבדיקה אם משתמש נתן לייק
commentSchema.methods.isLikedByUser = function(userId) {
  return this.likes.some(like => like.userId.toString() === userId.toString());
};

// מתודה לחישוב ציון התגובה
commentSchema.methods.calculateScore = function() {
  const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const likeWeight = this.likeCount * 2;
  const replyWeight = this.replyCount * 1.5;
  const recencyWeight = Math.max(0, 24 - ageInHours) / 24;
  
  return likeWeight + replyWeight + recencyWeight;
};

// מידלוור לעדכון הציון לפני שמירה
commentSchema.pre('save', function(next) {
  this.score = this.calculateScore();
  next();
});

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;