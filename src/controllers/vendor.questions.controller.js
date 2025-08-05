/* needed */
// src/controllers/vendor.questions.controller.js
import Comment from '../models/Comment.js';
import CommentNotification from '../models/CommentNotification.js';
import FullProduct from '../models/FullProduct.js';
import mongoose from 'mongoose';

export const VendorQuestionsController = {
  // קבלת כל השאלות שהופנו למוכר
  async getVendorQuestions(req, res) {
    try {
      const vendorId = req.user._id;
      const { page = 1, limit = 20, status = 'all' } = req.query;
      const skip = (page - 1) * limit;

      // מוצאים את כל המוצרים של המוכר
      const vendorProducts = await FullProduct.find({ vendorId }).select('_id');
      const productIds = vendorProducts.map(p => p._id);

      // בניית פילטר לשאלות
      const filter = {
        productId: { $in: productIds },
        commentType: 'QUESTION',
        status: 'ACTIVE'
      };

      // פילטר לפי סטטוס תשובה
      if (status === 'answered') {
        filter.vendorReplied = true;
      } else if (status === 'unanswered') {
        filter.vendorReplied = false;
      }

      // שליפת השאלות
      const questions = await Comment.find(filter)
        .populate('userId', 'fullName profileImage')
        .populate('productId', 'title displayImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // לכל שאלה, בדוק אם יש תשובה של המוכר
      const questionsWithReplies = await Promise.all(
        questions.map(async (question) => {
          const vendorReply = await Comment.findOne({
            parentCommentId: question._id,
            userId: vendorId,
            status: 'ACTIVE'
          }).populate('userId', 'fullName profileImage');

          return {
            ...question,
            vendorReply,
            hasVendorReply: !!vendorReply
          };
        })
      );

      // ספירת סה"כ שאלות
      const totalQuestions = await Comment.countDocuments(filter);

      res.json({
        success: true,
        questions: questionsWithReplies,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalQuestions / limit),
          totalQuestions,
          hasMore: page * limit < totalQuestions
        }
      });
    } catch (error) {
      console.error('Error getting vendor questions:', error);
      res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת השאלות',
        error: error.message
      });
    }
  },

  // קבלת התראות על שאלות חדשות
  async getNotifications(req, res) {
    try {
      const vendorId = req.user._id;
      const { onlyUnread = true } = req.query;

      const filter = { vendorId };
      if (onlyUnread === 'true') {
        filter.read = false;
      }

      const notifications = await CommentNotification.find(filter)
        .populate('userId', 'fullName profileImage')
        .populate('productId', 'title displayImage')
        .populate('commentId', 'content')
        .sort({ createdAt: -1 })
        .limit(50);

      // ספירת התראות שלא נקראו
      const unreadCount = await CommentNotification.countDocuments({
        vendorId,
        read: false
      });

      res.json({
        success: true,
        notifications,
        unreadCount
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת ההתראות',
        error: error.message
      });
    }
  },

  // סימון התראה כנקראה
  async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const vendorId = req.user._id;

      const notification = await CommentNotification.findOneAndUpdate(
        { _id: notificationId, vendorId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'התראה לא נמצאה'
        });
      }

      res.json({
        success: true,
        notification
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון ההתראה',
        error: error.message
      });
    }
  },

  // סימון כל ההתראות כנקראו
  async markAllNotificationsAsRead(req, res) {
    try {
      const vendorId = req.user._id;

      await CommentNotification.updateMany(
        { vendorId, read: false },
        { read: true, readAt: new Date() }
      );

      res.json({
        success: true,
        message: 'כל ההתראות סומנו כנקראו'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון ההתראות',
        error: error.message
      });
    }
  },

  // מענה על שאלה
  async replyToQuestion(req, res) {
    try {
      const { questionId } = req.params;
      const { content } = req.body;
      const vendorId = req.user._id;

      // וידוא שהשאלה קיימת ושייכת למוצר של המוכר
      const question = await Comment.findById(questionId)
        .populate('productId');

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'שאלה לא נמצאה'
        });
      }

      if (question.productId.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'אין הרשאה לענות על שאלה זו'
        });
      }

      // יצירת תשובה
      const reply = new Comment({
        productId: question.productId._id,
        userId: vendorId,
        content,
        parentCommentId: questionId,
        commentType: 'GENERAL'
      });

      await reply.save();

      // עדכון השאלה שהמוכר ענה
      question.vendorReplied = true;
      await question.save();

      // עדכון מספר התגובות
      await Comment.findByIdAndUpdate(
        questionId,
        { $inc: { replyCount: 1 } }
      );

      // שליפת התשובה המלאה
      const populatedReply = await Comment.findById(reply._id)
        .populate('userId', 'fullName profileImage');

      res.status(201).json({
        success: true,
        reply: populatedReply
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה ביצירת התשובה',
        error: error.message
      });
    }
  }
};