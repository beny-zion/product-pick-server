// controllers/vendor.analytics.controller.js
import { AggregationService } from '../../services/analytics/aggregation.service.js';
import { ProductStatsService } from '../../services/analytics/productStats.service.js';

export const VendorAnalyticsController = {
  // קבלת סטטיסטיקות כלליות למוכר
  async getVendorStats(req, res) {
    console.log("gggggggggg!!!!!");
    try {
      const { period } = req.query;
      const vendorId = req.user.id;
      console.log("vendorId: ", vendorId);
      console.log("period: ", period);

      const stats = await AggregationService.getVendorStats(vendorId, period);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  // קבלת סטטיסטיקות לפי מוצר
  async getProductStats(req, res) {
    try {
      const { productId } = req.params;
      const vendorId = req.user.id;
      console.log("objectId: ", productId);
      console.log("vendorId: ", vendorId);

      const stats = await ProductStatsService.getProductStats(productId, vendorId);
      console.log("stats: ", stats);
      if (!stats) {
        return res.status(404).json({ 
          success: false, 
          message: 'Product stats not found' 
        });
      }

      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
};