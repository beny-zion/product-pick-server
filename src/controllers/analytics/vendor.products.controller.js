// controllers/vendor/vendor.products.controller.js
import Product from '../../models/Product.js';

export const VendorProductsController = {
  // קבלת כל המוצרים של המוכר
  async getVendorProducts(req, res) {
    try {
      const vendorId = req.user.id;

      const products = await Product.find({ vendorId })
        .sort({ createdAt: -1 })  // מיון לפי תאריך יצירה - החדש ביותר קודם
        .populate('mainCategory', 'name');  // שליפת שם הקטגוריה

      res.json({
        success: true,
        data: products
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

      const product = await Product.findOne({
        _id: productId,
        vendorId
      }).populate('mainCategory', 'name');

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
  }
};