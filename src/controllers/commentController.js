// /* needed */
// // controllers/commentController.js
// import mongoose from 'mongoose';
// import Comment from '../models/Comment.js';
// import CommentNotification from '../models/CommentNotification.js';
// import FullProduct from '../models/FullProduct.js';
// import User from '../models/User.js';

// // פונקציה עזר ליצירת התראות
// const createNotification = async (vendorId, productId, commentId, userId, commentType) => {
//   try {
//     // אל תשלח התראה אם המוכר הוא גם מי שכתב את התגובה
//     if (vendorId.toString() === userId.toString()) {
//       return;
//     }

//     const notification = new CommentNotification({
//       vendorId,
//       productId,
//       commentId,
//       userId,
//       type: commentType === 'QUESTION' ? 'NEW_QUESTION' : 'NEW_OPINION'
//     });

//     await notification.save();
//   } catch (error) {
//     console.error('Error creating notification:', error);
//   }
// };

// export const commentController = {
//   // יצירת תגובה חדשה
//   async createComment(req, res) {
//     try {
//       const { productId, content, commentType, parentCommentId, quotedComment } = req.body;
//       const userId = req.user._id;

//       // בדיקת קיום המוצר
//       const product = await FullProduct.findById(productId);
//       if (!product) {
//         return res.status(404).json({
//           success: false,
//           message: 'מוצר לא נמצא'
//         });
//       }

//       // יצירת התגובה
//       const comment = new Comment({
//         productId,
//         userId,
//         content,
//         commentType: commentType || 'GENERAL',
//         parentCommentId: parentCommentId || null,
//         quotedComment: quotedComment || null
//       });

//       await comment.save();

//       // עדכון מספר התגובות בתגובה האב (אם קיימת)
//       if (parentCommentId) {
//         await Comment.findByIdAndUpdate(
//           parentCommentId,
//           { $inc: { replyCount: 1 } }
//         );
//       }

//       // יצירת התראה למוכר
//       await createNotification(product.vendorId, productId, comment._id, userId, commentType);

//       // שליפת התגובה המלאה עם populate
//       const populatedComment = await Comment.findById(comment._id)
//         .populate('userId', 'fullName profileImage')
//         .populate('quotedComment.commentId', 'content userId')
//         .populate('quotedComment.commentId.userId', 'fullName');

//       res.status(201).json({
//         success: true,
//         comment: populatedComment
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה ביצירת התגובה',
//         error: error.message
//       });
//     }
//   },

//   // קבלת תגובות למוצר
//   async getProductComments(req, res) {
//     try {
//       const { productId } = req.params;
//       const { page = 1, limit = 10, sort = 'newest' } = req.query;
//       const skip = (page - 1) * limit;

//       // הגדרת סידור
//       let sortOptions = {};
//       switch (sort) {
//         case 'newest':
//           sortOptions = { createdAt: -1 };
//           break;
//         case 'oldest':
//           sortOptions = { createdAt: 1 };
//           break;
//         case 'popular':
//           sortOptions = { score: -1 };
//           break;
//         case 'mostLiked':
//           sortOptions = { likeCount: -1 };
//           break;
//       }

//       // שליפת תגובות ראשיות בלבד
//       const comments = await Comment.find({
//         productId,
//         parentCommentId: null,
//         status: 'ACTIVE'
//       })
//         .populate('userId', 'fullName profileImage')
//         .populate('quotedComment.commentId', 'content userId')
//         .populate({
//           path: 'quotedComment.commentId',
//           populate: {
//             path: 'userId',
//             select: 'fullName'
//           }
//         })
//         .sort(sortOptions)
//         .skip(skip)
//         .limit(parseInt(limit));

//       // קבלת תגובות מקוננות לכל תגובה ראשית
//       const commentsWithReplies = await Promise.all(
//         comments.map(async (comment) => {
//           const replies = await Comment.find({
//             parentCommentId: comment._id,
//             status: 'ACTIVE'
//           })
//             .populate('userId', 'fullName profileImage')
//             .populate('quotedComment.commentId', 'content userId')
//             .populate({
//               path: 'quotedComment.commentId',
//               populate: {
//                 path: 'userId',
//                 select: 'fullName'
//               }
//             })
//             .sort({ createdAt: 1 })
//             .limit(5); // הגבלת תגובות מקוננות

//           return {
//             ...comment.toObject(),
//             replies,
//             hasMoreReplies: comment.replyCount > 5
//           };
//         })
//       );

//       // ספירת סך התגובות
//       const totalComments = await Comment.countDocuments({
//         productId,
//         parentCommentId: null,
//         status: 'ACTIVE'
//       });

//       res.json({
//         success: true,
//         comments: commentsWithReplies,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(totalComments / limit),
//           totalComments,
//           hasMore: page * limit < totalComments
//         }
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בשליפת התגובות',
//         error: error.message
//       });
//     }
//   },

//   // קבלת תגובות מקוננות לתגובה ספציפית
//   async getCommentReplies(req, res) {
//     try {
//       const { commentId } = req.params;
//       const { page = 1, limit = 10 } = req.query;
//       const skip = (page - 1) * limit;

//       const replies = await Comment.find({
//         parentCommentId: commentId,
//         status: 'ACTIVE'
//       })
//         .populate('userId', 'fullName profileImage')
//         .populate('quotedComment.commentId', 'content userId')
//         .sort({ createdAt: 1 })
//         .skip(skip)
//         .limit(parseInt(limit));

//       const totalReplies = await Comment.countDocuments({
//         parentCommentId: commentId,
//         status: 'ACTIVE'
//       });

//       res.json({
//         success: true,
//         replies,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(totalReplies / limit),
//           totalReplies,
//           hasMore: page * limit < totalReplies
//         }
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בשליפת התגובות המקוננות',
//         error: error.message
//       });
//     }
//   },

//   // לייק/ביטול לייק לתגובה
//   async toggleCommentLike(req, res) {
//     try {
//       const { commentId } = req.params;
//       const userId = req.user._id;

//       const comment = await Comment.findById(commentId);
//       if (!comment) {
//         return res.status(404).json({
//           success: false,
//           message: 'תגובה לא נמצאה'
//         });
//       }

//       const likeIndex = comment.likes.findIndex(
//         like => like.userId.toString() === userId.toString()
//       );

//       if (likeIndex > -1) {
//         // ביטול לייק
//         comment.likes.splice(likeIndex, 1);
//         comment.likeCount = Math.max(0, comment.likeCount - 1);
//       } else {
//         // הוספת לייק
//         comment.likes.push({ userId });
//         comment.likeCount += 1;
//       }

//       await comment.save();

//       res.json({
//         success: true,
//         liked: likeIndex === -1,
//         likeCount: comment.likeCount
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בעדכון הלייק',
//         error: error.message
//       });
//     }
//   },

//   // עדכון תגובה
//   async updateComment(req, res) {
//     try {
//       const { commentId } = req.params;
//       const { content } = req.body;
//       const userId = req.user._id;

//       const comment = await Comment.findOne({
//         _id: commentId,
//         userId,
//         status: 'ACTIVE'
//       });

//       if (!comment) {
//         return res.status(404).json({
//           success: false,
//           message: 'תגובה לא נמצאה או שאין הרשאה לעדכן'
//         });
//       }

//       comment.content = content;
//       await comment.save();

//       const updatedComment = await Comment.findById(commentId)
//         .populate('userId', 'fullName profileImage');

//       res.json({
//         success: true,
//         comment: updatedComment
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בעדכון התגובה',
//         error: error.message
//       });
//     }
//   },

//   // מחיקת תגובה
//   async deleteComment(req, res) {
//     try {
//       const { commentId } = req.params;
//       const userId = req.user._id;

//       const comment = await Comment.findOne({
//         _id: commentId,
//         userId,
//         status: 'ACTIVE'
//       });

//       if (!comment) {
//         return res.status(404).json({
//           success: false,
//           message: 'תגובה לא נמצאה או שאין הרשאה למחוק'
//         });
//       }

//       // סימון כמחוקה במקום מחיקה פיזית
//       comment.status = 'DELETED';
//       await comment.save();

//       // עדכון מספר התגובות בתגובה האב
//       if (comment.parentCommentId) {
//         await Comment.findByIdAndUpdate(
//           comment.parentCommentId,
//           { $inc: { replyCount: -1 } }
//         );
//       }

//       res.json({
//         success: true,
//         message: 'תגובה נמחקה בהצלחה'
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה במחיקת התגובה',
//         error: error.message
//       });
//     }
//   },

//   // קבלת סטטיסטיקות תגובות למוצר
//   async getCommentStats(req, res) {
//     try {
//       const { productId } = req.params;

//       const stats = await Comment.aggregate([
//         { 
//           $match: { 
//             productId: new mongoose.Types.ObjectId(productId), 
//             status: 'ACTIVE' 
//           } 
//         },
//         {
//           $group: {
//             _id: null,
//             totalComments: { $sum: 1 },
//             questions: {
//               $sum: { $cond: [{ $eq: ['$commentType', 'QUESTION'] }, 1, 0] }
//             },
//             opinions: {
//               $sum: { $cond: [{ $eq: ['$commentType', 'OPINION'] }, 1, 0] }
//             },
//             totalLikes: { $sum: '$likeCount' },
//             avgScore: { $avg: '$score' }
//           }
//         }
//       ]);

//       res.json({
//         success: true,
//         stats: stats[0] || {
//           totalComments: 0,
//           questions: 0,
//           opinions: 0,
//           totalLikes: 0,
//           avgScore: 0
//         }
//       });
//     } catch (error) {
//       console.error('Error getting comment stats:', error);
//       res.status(500).json({
//         success: true, // שינוי ל-true כדי למנוע שגיאות UI
//         stats: {
//           totalComments: 0,
//           questions: 0,
//           opinions: 0,
//           totalLikes: 0,
//           avgScore: 0
//         }
//       });
//     }
//   }
// };
// controllers/commentController.js
import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import CommentNotification from '../models/CommentNotification.js';
import FullProduct from '../models/FullProduct.js';
import User from '../models/User.js';
import { sanitizeHtml } from '../middlewares/sanitizer.middleware.js'; // 🆕

// פונקציה עזר ליצירת התראות
const createNotification = async (vendorId, productId, commentId, userId, commentType) => {
  try {
    // אל תשלח התראה אם המוכר הוא גם מי שכתב את התגובה
    if (vendorId.toString() === userId.toString()) {
      return;
    }

    const notification = new CommentNotification({
      vendorId,
      productId,
      commentId,
      userId,
      type: commentType === 'QUESTION' ? 'NEW_QUESTION' : 'NEW_OPINION'
    });

    await notification.save();
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const commentController = {
  // יצירת תגובה חדשה
  async createComment(req, res) {
    try {
      const { productId, content, commentType, parentCommentId, quotedComment } = req.body;
      const userId = req.user._id;

      // בדיקת קיום המוצר
      const product = await FullProduct.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'מוצר לא נמצא'
        });
      }

      // 🆕 ניקוי התוכן מ-HTML זדוני
      const cleanContent = sanitizeHtml(content);

      // יצירת התגובה
      const comment = new Comment({
        productId,
        userId,
        content: cleanContent, // 🆕 שימוש בתוכן המנוקה
        commentType: commentType || 'GENERAL',
        parentCommentId: parentCommentId || null,
        quotedComment: quotedComment ? {
          ...quotedComment,
          content: sanitizeHtml(quotedComment.content) // 🆕 ניקוי גם ציטוטים
        } : null
      });

      await comment.save();

      // עדכון מספר התגובות בתגובה האב (אם קיימת)
      if (parentCommentId) {
        await Comment.findByIdAndUpdate(
          parentCommentId,
          { $inc: { replyCount: 1 } }
        );
      }

      // יצירת התראה למוכר
      await createNotification(product.vendorId, productId, comment._id, userId, commentType);

      // שליפת התגובה המלאה עם populate
      const populatedComment = await Comment.findById(comment._id)
        .populate('userId', 'fullName profileImage')
        .populate('quotedComment.commentId', 'content userId')
        .populate('quotedComment.commentId.userId', 'fullName');

      res.status(201).json({
        success: true,
        comment: populatedComment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה ביצירת התגובה',
        error: error.message
      });
    }
  },

  // קבלת תגובות למוצר
  async getProductComments(req, res) {
    try {
      const { productId } = req.params;
      const { page = 1, limit = 10, sort = 'newest' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // הגדרת סדר מיון
      let sortOptions = {};
      switch (sort) {
        case 'oldest':
          sortOptions = { createdAt: 1 };
          break;
        case 'popular':
          sortOptions = { likeCount: -1, createdAt: -1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }

      // שליפת תגובות ראשיות בלבד
      const comments = await Comment.find({
        productId,
        parentCommentId: null,
        status: 'ACTIVE'
      })
      .populate('userId', 'fullName profileImage isVendor')
      .populate('quotedComment.commentId', 'content userId')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

      // ספירת סך התגובות
      const totalComments = await Comment.countDocuments({
        productId,
        parentCommentId: null,
        status: 'ACTIVE'
      });

      res.json({
        success: true,
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalComments / parseInt(limit)),
          totalComments,
          hasMore: skip + comments.length < totalComments
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת התגובות',
        error: error.message
      });
    }
  },

  // קבלת תגובות מקוננות
  async getCommentReplies(req, res) {
    try {
      const { commentId } = req.params;
      const { page = 1, limit = 5 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const replies = await Comment.find({
        parentCommentId: commentId,
        status: 'ACTIVE'
      })
      .populate('userId', 'fullName profileImage isVendor')
      .populate('quotedComment.commentId', 'content userId')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

      const totalReplies = await Comment.countDocuments({
        parentCommentId: commentId,
        status: 'ACTIVE'
      });

      res.json({
        success: true,
        replies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReplies / parseInt(limit)),
          totalReplies,
          hasMore: skip + replies.length < totalReplies
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת התשובות',
        error: error.message
      });
    }
  },

  // לייק/ביטול לייק
  async toggleCommentLike(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user._id;

      const comment = await Comment.findById(commentId);
      
      if (!comment || comment.status !== 'ACTIVE') {
        return res.status(404).json({
          success: false,
          message: 'תגובה לא נמצאה'
        });
      }

      const likeIndex = comment.likes.findIndex(
        like => like.userId.toString() === userId.toString()
      );

      if (likeIndex > -1) {
        // ביטול לייק
        comment.likes.splice(likeIndex, 1);
        comment.likeCount = Math.max(0, comment.likeCount - 1);
      } else {
        // הוספת לייק
        comment.likes.push({ userId });
        comment.likeCount += 1;
      }

      await comment.save();

      res.json({
        success: true,
        liked: likeIndex === -1,
        likeCount: comment.likeCount
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון הלייק',
        error: error.message
      });
    }
  },

  // עדכון תגובה - 🆕 עבר ל-route עם בדיקת בעלות
  async updateComment(req, res) {
    try {
      const { content } = req.body;
      const comment = req.comment; // 🆕 מגיע מ-middleware

      // 🆕 ניקוי התוכן החדש
      const cleanContent = sanitizeHtml(content);

      comment.content = cleanContent;
      await comment.save();

      const updatedComment = await Comment.findById(comment._id)
        .populate('userId', 'fullName profileImage');

      res.json({
        success: true,
        comment: updatedComment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון התגובה',
        error: error.message
      });
    }
  },

  // מחיקת תגובה - 🆕 עבר ל-route עם בדיקת בעלות
  async deleteComment(req, res) {
    try {
      const comment = req.comment; // 🆕 מגיע מ-middleware

      // סימון כמחוקה במקום מחיקה פיזית
      comment.status = 'DELETED';
      await comment.save();

      // עדכון מספר התגובות בתגובה האב
      if (comment.parentCommentId) {
        await Comment.findByIdAndUpdate(
          comment.parentCommentId,
          { $inc: { replyCount: -1 } }
        );
      }

      res.json({
        success: true,
        message: 'תגובה נמחקה בהצלחה'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה במחיקת התגובה',
        error: error.message
      });
    }
  },

  // קבלת סטטיסטיקות תגובות למוצר
  async getCommentStats(req, res) {
    try {
      const { productId } = req.params;

      const stats = await Comment.aggregate([
        { 
          $match: { 
            productId: new mongoose.Types.ObjectId(productId), 
            status: 'ACTIVE' 
          } 
        },
        {
          $group: {
            _id: null,
            totalComments: { $sum: 1 },
            questions: {
              $sum: { $cond: [{ $eq: ['$commentType', 'QUESTION'] }, 1, 0] }
            },
            opinions: {
              $sum: { $cond: [{ $eq: ['$commentType', 'OPINION'] }, 1, 0] }
            },
            totalLikes: { $sum: '$likeCount' },
            avgScore: { $avg: '$score' }
          }
        }
      ]);

      res.json({
        success: true,
        stats: stats[0] || {
          totalComments: 0,
          questions: 0,
          opinions: 0,
          totalLikes: 0,
          avgScore: 0
        }
      });
    } catch (error) {
      console.error('Error getting comment stats:', error);
      res.status(500).json({
        success: true,
        stats: {
          totalComments: 0,
          questions: 0,
          opinions: 0,
          totalLikes: 0,
          avgScore: 0
        }
      });
    }
  }
};