/* needed */
// import multer from 'multer';

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });

// export const upload = multer({ storage });
/* ✅ שמירה בזיכרון בלבד - ללא שמירה מקומית */
import multer from 'multer';

// שימוש ב-Memory Storage במקום Disk Storage
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // מגבלה של 5MB
  },
  fileFilter: (req, file, cb) => {
    // בדיקת סוג קובץ
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי תמונה מותרים!'), false);
    }
  }
});