/* needed */
// controllers/analytics/vendor.analytics.controller.js - גרסה מפושטת
import { AggregationService } from '../../services/analytics/aggregation.service.js';
import { ProductStatsService } from '../../services/analytics/productStats.service.js';

export const VendorAnalyticsController = {
  // קבלת סטטיסטיקות כלליות למוכר
  async getVendorStats(req, res) {
    try {
      const vendorId = req.user.id;

      const stats = await AggregationService.getVendorStats(vendorId);
      
      res.json({ 
        success: true, 
        data: stats 
      });
    } catch (error) {
      console.error('[VENDOR_ANALYTICS] Error getting vendor stats:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  // קבלת סטטיסטיקות לכל המוצרים של המוכר
  async getAllProductsStats(req, res) {
    try {
      const vendorId = req.user.id;
      
      const stats = await AggregationService.getVendorStats(vendorId);
      
      res.json({
        success: true,
        data: stats.productStats || []
      });
    } catch (error) {
      console.error('[VENDOR_ANALYTICS] Error getting all products stats:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // קבלת סטטיסטיקות למוצר ספציפי
  async getProductStats(req, res) {
    try {
      const { productId } = req.params;
      const vendorId = req.user.id;

      // וידוא שהמוצר שייך למוכר
      const FullProduct = (await import('../../models/FullProduct.js')).default;
      const product = await FullProduct.findOne({ _id: productId, vendorId });
      
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          message: 'Product not found or not owned by this vendor' 
        });
      }

      const stats = await ProductStatsService.getStats(productId);
      
      res.json({ 
        success: true, 
        data: {
          productId,
          productTitle: product.title,
          productImage: product.displayImage,
          ...stats
        }
      });
    } catch (error) {
      console.error('[VENDOR_ANALYTICS] Error getting product stats:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
};