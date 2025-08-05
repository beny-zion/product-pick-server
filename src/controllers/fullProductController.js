// /* needed */
// import FullProduct from '../models/FullProduct.js';
// import { productService } from '../services/aliexpress/product.service.js';

// // יצירת מוצר חדש
// export const createFullProduct = async (req, res) => {
//   try {
//     const { productData, recommendation } = req.body;
    
//     if (!productData || !recommendation) {
//       return res.status(400).json({
//         success: false,
//         message: 'נתוני מוצר והמלצה הם שדות חובה'
//       });
//     }

//     // יצירת מוצר חדש
//     const product = new FullProduct({
//       vendorId: req.user._id,
      
//       // נתונים שמגיעים מהבקשה
//       aliExpressProductId: productData.productId,
//       title: productData.title,
//       displayImage: productData.displayMedia || productData.images.main,
//       images: productData.images.small || [],
//       recommendation: recommendation,
      
//       // בחירה בין לינק שיווקי של המשתמש לבין הלינק הרגיל
//       affiliateLink: productData.isAffiliate ? 
//         productData.links.detail : 
//         productData.links.promotion,
//       isCustomAffiliateLink: productData.isAffiliate,
      
//       // נתוני אלי אקספרס
//       aliExpressData: {
//         price: parseFloat(productData.price.current),
//         originalPrice: parseFloat(productData.price.original),
//         discount: productData.price.discount,
//         categories: productData.categories,
//         stats: productData.stats,
//         lastChecked: new Date()
//       }
//     });

//     await product.save();
    
//     // שליפת המוצר המלא עם יחסים
//     const populatedProduct = await FullProduct.findById(product._id)
//       .populate('vendorId', 'fullName profileImage');
    
//     res.status(201).json({
//       success: true,
//       product: populatedProduct
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message || 'שגיאה בהוספת המוצר'
//     });
//   }
// };

// // קבלת מוצר לפי מזהה
// export const getFullProduct = async (req, res) => {
//   try {
//     const product = await FullProduct.findById(req.params.id)
//       .populate('vendorId', 'fullName profileImage');

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'מוצר לא נמצא'
//       });
//     }

//     res.json({
//       success: true,
//       product
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'שגיאה בשליפת המוצר',
//       error: error.message
//     });
//   }
// };

// // קבלת כל המוצרים עם פגינציה וסינון
// // תיקון מהיר לקונטרולר - החלף את הפונקציה getAllFullProducts
// export const getAllFullProducts = async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 12, 
//       vendor: vendorId, 
//       category: categoryId 
//     } = req.query;
    
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;
    
//     console.log('📤 בקשת מוצרים:', {
//       page: pageNumber,
//       limit: limitNumber,
//       skip,
//       vendorId,
//       categoryId
//     });
    
//     // בניית query
//     const filter = { status: 'ACTIVE' };
    
//     // סינון לפי מוכר
//     if (vendorId) {
//       filter.vendorId = vendorId;
//     }
    
//     // סינון לפי קטגוריה
//     if (categoryId) {
//       filter.$or = [
//         { 'aliExpressData.categories.main.id': categoryId },
//         { 'aliExpressData.categories.sub.id': categoryId }
//       ];
//     }
    
//     console.log('🔍 Filter:', filter);
    
//     // שליפת המוצרים עם population
//     const products = await FullProduct.find(filter)
//       .populate('vendorId', 'fullName profileImage bio ')
//       .skip(skip)
//       .limit(limitNumber)
//       .sort({ createdAt: -1 });
    
//     // ספירה כוללת
//     const totalProducts = await FullProduct.countDocuments(filter);
//     const totalPages = Math.ceil(totalProducts / limitNumber);
//     const hasMore = pageNumber < totalPages;
    
//     console.log('📊 תוצאות:', {
//       productsFound: products.length,
//       totalProducts,
//       totalPages,
//       currentPage: pageNumber,
//       hasMore
//     });
    
//     // 🔧 תגובה במבנה הנכון שהקלט מצפה לו
//     res.json({
//       success: true,          // ✅ חשוב!
//       products,
//       pagination: {           // ✅ חשוב! העטפה ב-pagination
//         currentPage: pageNumber,
//         totalPages,
//         totalProducts,
//         hasMore,             // ✅ זה הערך החשוב!
//         limit: limitNumber
//       }
//     });
    
//   } catch (error) {
//     console.error('❌ שגיאה בקבלת מוצרים:', error);
//     res.status(500).json({
//       success: false,
//       message: 'שגיאה בטעינת המוצרים',
//       error: error.message,
//       pagination: {
//         currentPage: 1,
//         totalPages: 0,
//         totalProducts: 0,
//         hasMore: false
//       }
//     });
//   }
// };


// // עדכון מוצר
// export const updateFullProduct = async (req, res) => {
//   try {
//     const productId = req.params.id;
//     const { recommendation, displayImage, status } = req.body;
    
//     // מוודאים שהמשתמש הוא בעל המוצר
//     const product = await FullProduct.findOne({ 
//       _id: productId, 
//       vendorId: req.user._id 
//     });
    
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'מוצר לא נמצא או שאין לך הרשאה לערוך אותו'
//       });
//     }

//     // עדכון השדות המותרים לעריכה
//     if (recommendation) product.recommendation = recommendation;
//     if (displayImage) product.displayImage = displayImage;
//     if (status) product.status = status;

//     await product.save();
    
//     res.json({
//       success: true,
//       product
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'שגיאה בעדכון המוצר',
//       error: error.message
//     });
//   }
// };

// // מחיקת מוצר
// export const deleteFullProduct = async (req, res) => {
//   try {
//     const productId = req.params.id;
    
//     // מוודאים שהמשתמש הוא בעל המוצר
//     const product = await FullProduct.findOne({ 
//       _id: productId, 
//       vendorId: req.user._id 
//     });
    
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'מוצר לא נמצא או שאין לך הרשאה למחוק אותו'
//       });
//     }

//     await FullProduct.findByIdAndDelete(productId);
    
//     res.json({
//       success: true,
//       message: 'המוצר נמחק בהצלחה'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'שגיאה במחיקת המוצר',
//       error: error.message
//     });
//   }
// };

// // בדיקת זמינות מוצר ועדכון נתונים מאלי אקספרס
// export const refreshProductData = async (req, res) => {
//   try {
//     const productId = req.params.id;
    
//     // מוודאים שהמשתמש הוא בעל המוצר
//     const product = await FullProduct.findOne({ 
//       _id: productId, 
//       vendorId: req.user._id 
//     });
    
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'מוצר לא נמצא או שאין לך הרשאה לעדכן אותו'
//       });
//     }

//     // קבלת נתונים מעודכנים מאלי אקספרס
//     const details = await productService.getProductsDetails(product.aliExpressProductId);
//     const parsedProduct = productService.parseProductResponse(details)[0];
    
//     if (!parsedProduct) {
//       // אם המוצר לא נמצא, סמן אותו כלא פעיל
//       product.status = 'INACTIVE';
//     } else {
//       // עדכון נתוני המוצר
//       product.aliExpressData = {
//         price: parseFloat(parsedProduct.price.current),
//         originalPrice: parseFloat(parsedProduct.price.original),
//         discount: parsedProduct.price.discount,
//         categories: parsedProduct.categories,
//         stats: parsedProduct.stats,
//         lastChecked: new Date()
//       };
      
//       // אם לא מדובר בלינק של המשתמש, עדכן את הלינק השיווקי
//       if (!product.isCustomAffiliateLink) {
//         product.affiliateLink = parsedProduct.links.promotion;
//       }
//     }
    
//     await product.save();
    
//     res.json({
//       success: true,
//       product,
//       message: 'נתוני המוצר עודכנו בהצלחה'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'שגיאה בעדכון נתוני המוצר',
//       error: error.message
//     });
//   }
// };
// controllers/fullProductController.js
// import FullProduct from '../models/FullProduct.js';
// import { productService } from '../services/aliexpress/product.service.js';
// import { sanitizeHtml } from '../middlewares/sanitizer.middleware.js'; // 🆕

// // יצירת מוצר חדש
// export const createFullProduct = async (req, res) => {
//   try {
//     const { productData, recommendation } = req.body;
    
//     if (!productData || !recommendation) {
//       return res.status(400).json({
//         success: false,
//         message: 'נתוני מוצר והמלצה הם שדות חובה'
//       });
//     }

//     // 🆕 ניקוי ההמלצה מ-HTML זדוני
//     const cleanRecommendation = sanitizeHtml(recommendation);
//     const cleanTitle = sanitizeHtml(productData.title);

//     // יצירת מוצר חדש
//     const product = new FullProduct({
//       vendorId: req.user._id,
      
//       // נתונים שמגיעים מהבקשה
//       aliExpressProductId: productData.productId,
//       title: cleanTitle, // 🆕 כותרת מנוקה
//       displayImage: productData.displayMedia || productData.images.main,
//       images: productData.images.small || [],
//       recommendation: cleanRecommendation, // 🆕 המלצה מנוקה
      
//       // בחירה בין לינק שיווקי של המשתמש לבין הלינק הרגיל
//       affiliateLink: productData.isAffiliate ? 
//         productData.links.detail : 
//         productData.links.promotion,
//       isCustomAffiliateLink: productData.isAffiliate,
      
//       // נתוני אלי אקספרס
//       aliExpressData: {
//         price: parseFloat(productData.price.current),
//         originalPrice: parseFloat(productData.price.original),
//         discount: productData.price.discount,
//         categories: productData.categories,
//         stats: productData.stats,
//         lastChecked: new Date()
//       }
//     });

//     await product.save();
    
//     // שליפת המוצר המלא עם יחסים
//     const populatedProduct = await FullProduct.findById(product._id)
//       .populate('vendorId', 'fullName profileImage');
    
//     res.status(201).json({
//       success: true,
//       product: populatedProduct
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message || 'שגיאה בהוספת המוצר'
//     });
//   }
// };

// // קבלת מוצר לפי מזהה
// export const getFullProduct = async (req, res) => {
//   try {
//     const product = await FullProduct.findById(req.params.id)
//       .populate('vendorId', 'fullName profileImage bio social');
    
//     if (!product || product.status !== 'ACTIVE') {
//       return res.status(404).json({
//         success: false,
//         message: 'מוצר לא נמצא'
//       });
//     }
    
//     res.json({
//       success: true,
//       product
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message || 'שגיאה בטעינת המוצר'
//     });
//   }
// };

// // קבלת כל המוצרים
// export const getAllFullProducts = async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 10, 
//       vendorId, 
//       sort = 'newest',
//       minPrice,
//       maxPrice,
//       category
//     } = req.query;
    
//     const skip = (parseInt(page) - 1) * parseInt(limit);
    
//     // בניית פילטר
//     const filter = { status: 'ACTIVE' };
    
//     if (vendorId) filter.vendorId = vendorId;
    
//     // 🆕 פילטר מחיר בטוח
//     if (minPrice || maxPrice) {
//       filter['aliExpressData.price'] = {};
//       if (minPrice) filter['aliExpressData.price'].$gte = parseFloat(minPrice);
//       if (maxPrice) filter['aliExpressData.price'].$lte = parseFloat(maxPrice);
//     }
    
//     // 🆕 פילטר קטגוריה בטוח
//     if (category) {
//       filter['aliExpressData.categories.main.name'] = new RegExp(category, 'i');
//     }
    
//     // הגדרת מיון
//     let sortOptions = {};
//     switch(sort) {
//       case 'price_asc':
//         sortOptions = { 'aliExpressData.price': 1 };
//         break;
//       case 'price_desc':
//         sortOptions = { 'aliExpressData.price': -1 };
//         break;
//       case 'oldest':
//         sortOptions = { createdAt: 1 };
//         break;
//       default: // newest
//         sortOptions = { createdAt: -1 };
//     }
    
//     const products = await FullProduct
//       .find(filter)
//       .populate('vendorId', 'fullName profileImage')
//       .sort(sortOptions)
//       .skip(skip)
//       .limit(parseInt(limit));
    
//     const totalProducts = await FullProduct.countDocuments(filter);
    
//     res.json({
//       success: true,
//       products,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(totalProducts / parseInt(limit)),
//         totalProducts,
//         hasMore: skip + products.length < totalProducts
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message || 'שגיאה בטעינת המוצרים'
//     });
//   }
// };

// // עדכון מוצר - 🆕 עם בדיקת בעלות מ-middleware
// export const updateFullProduct = async (req, res) => {
//   try {
//     const product = req.product; // 🆕 מגיע מ-middleware
//     const allowedUpdates = ['title', 'recommendation', 'displayImage', 'status', 'isCustomAffiliateLink', 'affiliateLink'];
//     const updates = {};
    
//     // 🆕 סינון וניקוי עדכונים
//     for (const key of allowedUpdates) {
//       if (req.body[key] !== undefined) {
//         if (key === 'title' || key === 'recommendation') {
//           updates[key] = sanitizeHtml(req.body[key]); // 🆕 ניקוי
//         } else {
//           updates[key] = req.body[key];
//         }
//       }
//     }
    
//     // עדכון המוצר
//     Object.assign(product, updates);
//     await product.save();
    
//     const updatedProduct = await FullProduct
//       .findById(product._id)
//       .populate('vendorId', 'fullName profileImage');
    
//     res.json({
//       success: true,
//       product: updatedProduct
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message || 'שגיאה בעדכון המוצר'
//     });
//   }
// };

// // מחיקת מוצר - 🆕 עם בדיקת בעלות מ-middleware
// export const deleteFullProduct = async (req, res) => {
//   try {
//     const product = req.product; // 🆕 מגיע מ-middleware
    
//     // מחיקה רכה - שינוי סטטוס בלבד
//     product.status = 'INACTIVE';
//     await product.save();
    
//     res.json({
//       success: true,
//       message: 'המוצר נמחק בהצלחה'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message || 'שגיאה במחיקת המוצר'
//     });
//   }
// };

// // רענון נתוני מוצר - 🆕 עם בדיקת בעלות
// export const refreshProductData = async (req, res) => {
//   try {
//     const product = req.product; // 🆕 מגיע מ-middleware
    
//     // שליפת נתונים מעודכנים מ-AliExpress
//     const freshData = await productService.getProductsDetails(product.aliExpressProductId);
    
//     if (!freshData || !freshData.result || freshData.result.products.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'לא נמצאו נתונים מעודכנים'
//       });
//     }
    
//     const updatedData = freshData.result.products[0];
    
//     // עדכון נתוני המוצר
//     product.aliExpressData = {
//       price: parseFloat(updatedData.product_sale_price.value),
//       originalPrice: parseFloat(updatedData.product_original_price.value),
//       discount: updatedData.product_promotion_discount,
//       categories: product.aliExpressData.categories, // שמירת קטגוריות קיימות
//       stats: {
//         commission: updatedData.commission_rate,
//         sales: updatedData.product_sales,
//         rating: updatedData.product_evaluation_score
//       },
//       lastChecked: new Date()
//     };
    
//     await product.save();
    
//     res.json({
//       success: true,
//       product,
//       message: 'נתוני המוצר עודכנו בהצלחה'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message || 'שגיאה ברענון נתוני המוצר'
//     });
//   }
// };
// controllers/fullProductController.js - גרסה מתוקנת
import FullProduct from '../models/FullProduct.js';
import { productService } from '../services/aliexpress/product.service.js';
import { sanitizeHtml } from '../middlewares/sanitizer.middleware.js';

// יצירת מוצר חדש
export const createFullProduct = async (req, res) => {
  try {
    const { productData, recommendation } = req.body;
    
    if (!productData || !recommendation) {
      return res.status(400).json({
        success: false,
        message: 'נתוני מוצר והמלצה הם שדות חובה'
      });
    }

    // ניקוי ההמלצה מ-HTML זדוני
    const cleanRecommendation = sanitizeHtml(recommendation);
    const cleanTitle = sanitizeHtml(productData.title);

    // יצירת מוצר חדש
    const product = new FullProduct({
      vendorId: req.user._id,
      
      // נתונים שמגיעים מהבקשה
      aliExpressProductId: productData.productId,
      title: cleanTitle,
      displayImage: productData.displayMedia || productData.images.main,
      images: productData.images.small || [],
      recommendation: cleanRecommendation,
      
      // בחירה בין לינק שיווקי של המשתמש לבין הלינק הרגיל
      affiliateLink: productData.isAffiliate ? 
        productData.links.detail : 
        productData.links.promotion,
      isCustomAffiliateLink: productData.isAffiliate,
      
      // נתוני אלי אקספרס
      aliExpressData: {
        price: parseFloat(productData.price.current),
        originalPrice: parseFloat(productData.price.original),
        discount: productData.price.discount,
        categories: productData.categories,
        stats: productData.stats,
        lastChecked: new Date()
      }
    });

    await product.save();
    
    // שליפת המוצר המלא עם יחסים
    const populatedProduct = await FullProduct.findById(product._id)
      .populate('vendorId', 'fullName profileImage');
    
    res.status(201).json({
      success: true,
      product: populatedProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בהוספת המוצר'
    });
  }
};

// קבלת מוצר לפי מזהה
export const getFullProduct = async (req, res) => {
  try {
    const product = await FullProduct.findById(req.params.id)
      .populate('vendorId', 'fullName profileImage bio social');
    
    if (!product || product.status !== 'ACTIVE') {
      return res.status(404).json({
        success: false,
        message: 'מוצר לא נמצא'
      });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בטעינת המוצר'
    });
  }
};

// 🔧 פונקציה מתוקנת - תומכת בכל סוגי הפילטרים
export const getAllFullProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12,
      // תמיכה בפורמטים שונים
      vendor,
      vendorId,
      category,
      categoryId,
      sort = 'newest',
      minPrice,
      maxPrice,
      minRating,
      q: searchQuery
    } = req.query;
    
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    console.log('📤 בקשת מוצרים עם פרמטרים:', {
      page: pageNumber,
      limit: limitNumber,
      vendor: vendor || vendorId,
      category: category || categoryId,
      sort,
      minPrice,
      maxPrice,
      minRating,
      searchQuery
    });
    
    // בניית query
    const filter = { status: 'ACTIVE' };
    
    // 🔧 טיפול במוכר - תמיכה בשני הפורמטים
    const vendorFilter = vendor || vendorId;
    if (vendorFilter) {
      filter.vendorId = vendorFilter;
      console.log('🔍 סינון לפי מוכר:', vendorFilter);
    }
    
    // 🔧 טיפול בקטגוריה - תמיכה בשני הפורמטים
    const categoryFilter = category || categoryId;
    if (categoryFilter) {
      filter.$or = [
        { 'aliExpressData.categories.main.id': String(categoryFilter) },
        { 'aliExpressData.categories.sub.id': String(categoryFilter) }
      ];
      console.log('🔍 סינון לפי קטגוריה:', categoryFilter);
    }
    
    // 🔧 חיפוש טקסט
    if (searchQuery && searchQuery.trim()) {
      const searchRegex = { $regex: searchQuery.trim(), $options: 'i' };
      
      // אם יש כבר $or מהקטגוריה, צריך לשלב
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          {
            $or: [
              { title: searchRegex },
              { recommendation: searchRegex },
              { 'aliExpressData.categories.main.name': searchRegex }
            ]
          }
        ];
        delete filter.$or;
      } else {
        filter.$or = [
          { title: searchRegex },
          { recommendation: searchRegex },
          { 'aliExpressData.categories.main.name': searchRegex }
        ];
      }
      console.log('🔍 חיפוש טקסט:', searchQuery);
    }
    
    // 🔧 פילטר מחיר
    if (minPrice || maxPrice) {
      filter['aliExpressData.price'] = {};
      if (minPrice) {
        filter['aliExpressData.price'].$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        filter['aliExpressData.price'].$lte = parseFloat(maxPrice);
      }
      console.log('🔍 סינון מחיר:', filter['aliExpressData.price']);
    }
    
    // 🔧 פילטר דירוג
    if (minRating) {
      // המרת דירוג מחרוזת למספר אם צריך
      filter['aliExpressData.stats.rating'] = { $gte: parseFloat(minRating) };
      console.log('🔍 סינון דירוג מינימלי:', minRating);
    }
    
    // 🔧 הגדרת מיון משופרת
    let sortOptions = {};
    switch(sort) {
      case 'price_asc':
        sortOptions = { 'aliExpressData.price': 1 };
        break;
      case 'price_desc':
        sortOptions = { 'aliExpressData.price': -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'popular':
        sortOptions = { 'aliExpressData.stats.sales': -1 };
        break;
      case 'rating':
        sortOptions = { 'aliExpressData.stats.rating': -1 };
        break;
      case 'relevance':
        // אם יש חיפוש, מיין לפי רלוונטיות
        if (searchQuery) {
          sortOptions = { score: { $meta: 'textScore' } };
        } else {
          sortOptions = { createdAt: -1 };
        }
        break;
      default: // newest
        sortOptions = { createdAt: -1 };
    }
    
    console.log('🔍 Filter סופי:', JSON.stringify(filter, null, 2));
    console.log('📊 Sort:', sortOptions);
    
    // שליפת המוצרים עם population
    const products = await FullProduct.find(filter)
      .populate('vendorId', 'fullName profileImage bio email')
      .skip(skip)
      .limit(limitNumber)
      .sort(sortOptions);
    
    // ספירה כוללת
    const totalProducts = await FullProduct.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitNumber);
    const hasMore = pageNumber < totalPages;
    
    console.log('📊 תוצאות:', {
      productsFound: products.length,
      totalProducts,
      totalPages,
      currentPage: pageNumber,
      hasMore
    });
    
    // תגובה במבנה הנכון
    res.json({
      success: true,
      products,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalProducts,
        hasMore,
        limit: limitNumber
      }
    });
    
  } catch (error) {
    console.error('❌ שגיאה בקבלת מוצרים:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת המוצרים',
      error: error.message,
      products: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalProducts: 0,
        hasMore: false
      }
    });
  }
};

// עדכון מוצר - עם בדיקת בעלות מ-middleware
export const updateFullProduct = async (req, res) => {
  try {
    const product = req.product; // מגיע מ-middleware
    const allowedUpdates = ['title', 'recommendation', 'displayImage', 'status', 'isCustomAffiliateLink', 'affiliateLink'];
    const updates = {};
    
    // סינון וניקוי עדכונים
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === 'title' || key === 'recommendation') {
          updates[key] = sanitizeHtml(req.body[key]);
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    
    // עדכון המוצר
    Object.assign(product, updates);
    await product.save();
    
    const updatedProduct = await FullProduct
      .findById(product._id)
      .populate('vendorId', 'fullName profileImage');
    
    res.json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה בעדכון המוצר'
    });
  }
};

// מחיקת מוצר - עם בדיקת בעלות מ-middleware
export const deleteFullProduct = async (req, res) => {
  try {
    const product = req.product; // מגיע מ-middleware
    
    // מחיקה רכה - שינוי סטטוס בלבד
    product.status = 'INACTIVE';
    await product.save();
    
    res.json({
      success: true,
      message: 'המוצר נמחק בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה במחיקת המוצר'
    });
  }
};

// רענון נתוני מוצר - עם בדיקת בעלות
export const refreshProductData = async (req, res) => {
  try {
    const product = req.product; // מגיע מ-middleware
    
    // שליפת נתונים מעודכנים מ-AliExpress
    const freshData = await productService.getProductsDetails(product.aliExpressProductId);
    
    if (!freshData || !freshData.result || freshData.result.products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'לא נמצאו נתונים מעודכנים'
      });
    }
    
    const updatedData = freshData.result.products[0];
    
    // עדכון נתוני המוצר
    product.aliExpressData = {
      price: parseFloat(updatedData.product_sale_price.value),
      originalPrice: parseFloat(updatedData.product_original_price.value),
      discount: updatedData.product_promotion_discount,
      categories: product.aliExpressData.categories, // שמירת קטגוריות קיימות
      stats: {
        commission: updatedData.commission_rate,
        sales: updatedData.product_sales,
        rating: updatedData.product_evaluation_score
      },
      lastChecked: new Date()
    };
    
    await product.save();
    
    res.json({
      success: true,
      product,
      message: 'נתוני המוצר עודכנו בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה ברענון נתוני המוצר'
    });
  }
};