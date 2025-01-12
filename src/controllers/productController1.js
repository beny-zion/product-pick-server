import Product from '../models/Product.js';
import { cloudinary } from '../config/cloudinary.js';
import { fetchAliExpressData } from '../services/aliExpress.js';

// הוספת מוצר חדש
export const createProduct = async (req, res) => {
  try {
    const { aliExpressUrl } = req.body;
    
    // בדיקת מגבלת מוצרים למוכר
    const productsCount = await Product.countDocuments({ vendorId: req.user._id });
    if (productsCount >= req.user.productsLimit) {
      return res.status(403).json({
        success: false,
        message: 'הגעת למגבלת המוצרים המקסימלית'
      });
    }

    // שליפת מידע מאלי אקספרס
    const apiData = await fetchAliExpressData(aliExpressUrl);
    
    // העלאת תמונה לקלאודינרי
    let displayImage = apiData.images[0];
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'products',
      });
      displayImage = uploadResult.secure_url;
    }

    const product = new Product({
      ...req.body,
      vendorId: req.user._id,
      displayImage,
      apiData
    });

    await product.save();
    
    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בהוספת המוצר',
      error: error.message
    });
  }
};

// עדכון מוצר
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'מוצר לא נמצא'
      });
    }

    // עדכון שדות
    const updates = { ...req.body };
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'products',
      });
      updates.displayImage = uploadResult.secure_url;
    }

    Object.assign(product, updates);
    await product.save();

    res.json({
      success: true,
      product
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
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'מוצר לא נמצא'
      });
    }

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