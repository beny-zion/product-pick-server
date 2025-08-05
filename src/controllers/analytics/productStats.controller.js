/* needed */
// controllers/analytics/productStats.controller.js - גרסה מפושטת
import { ProductStatsService } from '../../services/analytics/productStats.service.js';

export const ProductStatsController = {
  // תיעוד פתיחת מודל מוצר
  async trackModalOpen(req, res) {
    try {
      const { productId } = req.body;
      const userId = req.user?.id; // אופציונלי

      await ProductStatsService.trackModalOpen(productId, userId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking modal open:', error);
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

      await ProductStatsService.trackClick(productId, userId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking click:', error);
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
      console.error('Error getting stats:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },
  
  // קבלת סטטיסטיקות למספר מוצרים
  async getBatchStats(req, res) {
    try {
      const { productIds } = req.body;
      
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'נדרשת רשימת מזהי מוצרים'
        });
      }
      
      const limitedIds = productIds.slice(0, 20);
      const statsPromises = limitedIds.map(id => ProductStatsService.getStats(id));
      const results = await Promise.all(statsPromises);
      
      const statsMap = {};
      limitedIds.forEach((id, index) => {
        statsMap[id] = results[index];
      });
      
      res.json({ success: true, stats: statsMap });
    } catch (error) {
      console.error('Error getting batch stats:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
};