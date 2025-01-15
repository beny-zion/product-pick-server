import { ProductStatsService } from '../../services/analytics/productStats.service.js';

export const ProductStatsController = {
  // תיעוד צפייה במוצר
  async trackView(req, res) {
    try {
      const { productId, viewDuration } = req.body;
      const userId = req.user?.id; // אופציונלי

      const stats = await ProductStatsService.trackView(
        productId, 
        viewDuration,
        userId
      );

      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  // תיעוד קליק על קישור אפיליאט
  async trackClick(req, res) {
    try {
      const { productId } = req.body;
      const userId = req.user?.id;

      const stats = await ProductStatsService.trackClick(
        productId,
        userId
      );

      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },

  // קבלת סטטיסטיקות מוצר
  async getStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await ProductStatsService.getStats(id);
      
      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
};