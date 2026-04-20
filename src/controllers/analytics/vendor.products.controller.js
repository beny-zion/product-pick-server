/* needed */
// controllers/vendor/vendor.products.controller.js
import FullProduct from '../../models/FullProduct.js';
import Store from '../../models/Store.js';

export const VendorProductsController = {
  // קבלת כל המוצרים של המוכר
  async getVendorProducts(req, res) {
    try {
      const vendorId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Lazy migration: שיוך מוצרים ללא חנות לחנות ברירת מחדל
      const orphanCount = await FullProduct.countDocuments({ vendorId, storeId: { $exists: false } });
      const orphanCountNull = await FullProduct.countDocuments({ vendorId, storeId: null });
      if (orphanCount > 0 || orphanCountNull > 0) {
        const defaultStore = await Store.getOrCreateDefault(vendorId, req.user.fullName);
        await FullProduct.updateMany(
          { vendorId, $or: [{ storeId: { $exists: false } }, { storeId: null }] },
          { $set: { storeId: defaultStore._id } }
        );
        // עדכון ספירת מוצרים
        const count = await FullProduct.countDocuments({ storeId: defaultStore._id, status: 'ACTIVE' });
        await Store.findByIdAndUpdate(defaultStore._id, { productCount: count });
      }

      const filter = { vendorId };
      if (req.query.storeId) {
        filter.storeId = req.query.storeId;
      }

      const products = await FullProduct.find(filter)
        .populate('storeId', 'name slug logo isLocked isDefault')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalProducts = await FullProduct.countDocuments(filter);

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
        'affiliateLink',
        'storeId'
      ];

      // מיפוי העדכונים המותרים בלבד
      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      // ולידציה והעברת מוצר בין חנויות
      if (filteredUpdates.storeId) {
        const targetStore = await Store.findOne({ _id: filteredUpdates.storeId, vendorId });
        if (!targetStore) {
          return res.status(400).json({ success: false, message: 'חנות יעד לא תקינה' });
        }
        if (targetStore.isLocked) {
          return res.status(400).json({
            success: false,
            message: 'לא ניתן להעביר מוצרים לחנות נעולה',
            code: 'TARGET_STORE_LOCKED',
          });
        }
        // עדכון ספירת מוצרים
        if (product.storeId && product.storeId.toString() !== filteredUpdates.storeId) {
          await Store.findByIdAndUpdate(product.storeId, { $inc: { productCount: -1 } });
          await Store.findByIdAndUpdate(filteredUpdates.storeId, { $inc: { productCount: 1 } });
        }
      }

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