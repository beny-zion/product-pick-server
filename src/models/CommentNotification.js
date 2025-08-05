/* needed */
// models/CommentNotification.js
import mongoose from "mongoose";

const commentNotificationSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FullProduct',
    required: true
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['NEW_QUESTION', 'NEW_OPINION', 'REPLY_TO_VENDOR', 'PRODUCT_MENTIONED'],
    required: true
  },
  content: {
    type: String,
    maxLength: 200
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// אינדקסים
commentNotificationSchema.index({ vendorId: 1, read: 1 });
commentNotificationSchema.index({ createdAt: -1 });

const CommentNotification = mongoose.model('CommentNotification', commentNotificationSchema);
export default CommentNotification;