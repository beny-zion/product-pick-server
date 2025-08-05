/* needed */
// controllers/vendor/vendor.products.controller.js
import FullProduct from '../../models/FullProduct.js';

export const VendorProductsController = {
  // קבלת כל המוצרים של המוכר
  async getVendorProducts(req, res) {
    try {
      const vendorId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const products = await FullProduct.find({ vendorId })
        .sort({ createdAt: -1 })  // מיון לפי תאריך יצירה - החדש ביותר קודם
        .skip(skip)
        .limit(limit);

      const totalProducts = await FullProduct.countDocuments({ vendorId });

      res.json({
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total: totalProducts,
          pages: Math.ceil(totalProducts / limit)
        }
      });
    } catch (error) {
      console.error('Error getting vendor products:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // קבלת מוצר ספציפי של המוכר
  async getVendorProduct(req, res) {
    try {
      const vendorId = req.user.id;
      const productId = req.params.id;

      const product = await FullProduct.findOne({
        _id: productId,
        vendorId
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      console.error('Error getting vendor product:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  // עדכון מוצר קיים
  async updateProduct(req, res) {
    try {
      const vendorId = req.user.id;
      const productId = req.params.id;
      const updates = req.body;
      
      // וידוא שהמוצר שייך למוכר
      const product = await FullProduct.findOne({
        _id: productId,
        vendorId
      });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or not owned by this vendor'
        });
      }
      
      // שדות שמותר למוכר לעדכן
      const allowedUpdates = [
        'title', 
        'recommendation', 
        'displayImage',
        'status',
        'images',
        'isCustomAffiliateLink',
        'affiliateLink'
      ];
      
      // מיפוי העדכונים המותרים בלבד
      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });
      
      // עדכון המוצר
      const updatedProduct = await FullProduct.findByIdAndUpdate(
        productId,
        { $set: filteredUpdates },
        { new: true }
      );
      
      res.json({
        success: true,
        data: updatedProduct
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  // מחיקת מוצר
  async deleteProduct(req, res) {
    try {
      const vendorId = req.user.id;
      const productId = req.params.id;
      
      // וידוא שהמוצר שייך למוכר
      const product = await FullProduct.findOne({
        _id: productId,
        vendorId
      });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or not owned by this vendor'
        });
      }
      
      // מחיקת המוצר
      await FullProduct.findByIdAndDelete(productId);
      
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};