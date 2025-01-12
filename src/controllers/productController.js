import Product from '../models/Product.js';

export const createProduct = async (req, res) => {
  try {
    const { htmlCode, recommendation, mainCategory } = req.body;
    
    // בדיקת תקינות של הקטגוריות
    if (!mainCategory) {
      throw new Error('חובה לבחור קטגוריה ראשית');
    }

    // if (!categories || categories.length === 0) {
    //   throw new Error('חובה לבחור לפחות קטגוריה משנית אחת');
    // }

    // חילוץ הלינק והתמונה מה-HTML
    const { affiliateLink, imageUrl } = Product.extractFromHtml(htmlCode);

    const product = new Product({
      vendorId: req.user._id,
      rawHtml: htmlCode,
      affiliateLink,
      imageUrl,
      recommendation,
      mainCategory,
      
    });

    await product.save();
    
    // השב את המוצר עם כל הפרטים המלאים
    const populatedProduct = await Product.findById(product._id)
      .populate('mainCategory')
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

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendorId', 'fullName profileImage');

    if (!product) {
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
      message: 'שגיאה בשליפת המוצר',
      error: error.message
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // מאפשר סינון לפי קטגוריה אם יש
    const filter = {};
    if (req.query.category) {
      filter.mainCategory = req.query.category; // MongoDB יחפש אוטומטית בתוך המערך
    }

    // שליפת המוצרים עם פגינציה
    const products = await Product.find(filter)
      .populate('vendorId', 'fullName profileImage')
      .populate('mainCategory', 'name') // מוסיפים populate לקטגוריות
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // ספירת סך כל המוצרים למטרת פגינציה
    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת המוצרים',
      error: error.message
    });
  }
};
  // עדכון מוצר
export const updateProduct = async (req, res) => {
    try {
      const productId = req.params.id;
      const updates = {};
  
      // אם יש HTML חדש, נחלץ ממנו את הפרטים
      if (req.body.htmlCode) {
        const { affiliateLink, imageUrl } = Product.extractFromHtml(req.body.htmlCode);
        updates.rawHtml = req.body.htmlCode;
        updates.affiliateLink = affiliateLink;
        updates.imageUrl = imageUrl;
      }
  
      // אם יש המלצה חדשה
      if (req.body.recommendation) {
        updates.recommendation = req.body.recommendation;
      }
  
      // מוודאים שהמשתמש הוא בעל המוצר
      const product = await Product.findOne({ _id: productId, vendorId: req.user._id });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'מוצר לא נמצא או שאין לך הרשאה לערוך אותו'
        });
      }
  
      // עדכון המוצר
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: updates },
        { new: true }
      ).populate('vendorId', 'fullName profileImage');
  
      res.json({
        success: true,
        product: updatedProduct
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון המוצר',
        error: error.message
      });
    }
  };
  
  // מחיקת מוצר
export const deleteProduct = async (req, res) => {
    try {
      const productId = req.params.id;
      
      // מוודאים שהמשתמש הוא בעל המוצר
      const product = await Product.findOne({ _id: productId, vendorId: req.user._id });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'מוצר לא נמצא או שאין לך הרשאה למחוק אותו'
        });
      }
  
      await Product.findByIdAndDelete(productId);
  
      res.json({
        success: true,
        message: 'המוצר נמחק בהצלחה'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה במחיקת המוצר',
        error: error.message
      });
    }
  };