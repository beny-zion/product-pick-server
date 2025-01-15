// services/analytics/productStats.service.js
import Product from '../../models/Product.js';
import ProductStats from '../../models/ProductStats.js';
import { UserInterestsService } from './userInterests.service.js';

export const ProductStatsService = {
  async trackView(productId, viewDuration, userId = null) {
    try {
      const currentHour = new Date().getHours();
      const today = new Date().setHours(0, 0, 0, 0);

      // מצא או צור סטטיסטיקות למוצר
      let stats = await ProductStats.findOne({ productId });
      
      if (!stats) {
        // קבל את המוצר כדי לקבל את vendorId
        const product = await Product.findById(productId);
        if (!product) {
          throw new Error('Product not found');
        }

        // יצירת סטטיסטיקות חדשות
        stats = new ProductStats({
          productId,
          vendorId: product.vendorId,
          hourlyStats: [{
            hour: currentHour,
            date: new Date(today),
            views: 0,
            clicks: 0,
            viewDuration: 0
          }],
          dailyStats: {
            date: new Date(today),
            totalViews: 0,
            totalClicks: 0,
            totalViewTime: 0,
            averageViewTime: 0
          }
        });
      }

      // עדכון הסטטיסטיקות
      const hourIndex = stats.hourlyStats.findIndex(
        stat => stat.hour === currentHour && 
               stat.date.getTime() === today
      );

      if (hourIndex === -1) {
        stats.hourlyStats.push({
          hour: currentHour,
          date: new Date(today),
          views: 1,
          viewDuration
        });
      } else {
        stats.hourlyStats[hourIndex].views += 1;
        stats.hourlyStats[hourIndex].viewDuration += viewDuration;
      }

      // עדכון סטטיסטיקות יומיות
      stats.dailyStats.totalViews += 1;
      stats.dailyStats.totalViewTime += viewDuration;
      stats.dailyStats.averageViewTime = 
        stats.dailyStats.totalViewTime / stats.dailyStats.totalViews;
      
      stats.lastUpdated = new Date();
      await stats.save();

      // עדכון תחומי עניין למשתמש אם מחובר
      if (userId) {
        await UserInterestsService.trackView(userId, productId);
      }

      return stats;
    } catch (error) {
      console.error('Error tracking view:', error);
      throw error;
    }
  },

  async trackClick(productId, userId = null) {
    try {
      const currentHour = new Date().getHours();
      const today = new Date().setHours(0, 0, 0, 0);

      const stats = await ProductStats.findOneAndUpdate(
        { productId },
        {
          $inc: {
            'hourlyStats.$[hour].clicks': 1,
            'dailyStats.totalClicks': 1
          }
        },
        {
          arrayFilters: [
            { 
              'hour.hour': currentHour, 
              'hour.date': new Date(today) 
            }
          ],
          upsert: true,
          new: true
        }
      );

      if (userId) {
        await UserInterestsService.trackClick(userId, productId);
      }

      return stats;
    } catch (error) {
      console.error('Error tracking click:', error);
      throw error;
    }
  },
  async getProductStats(productId, vendorId) {
    try {
      const stats = await ProductStats.findOne({ 
        productId,
        vendorId  // חשוב לוודא שהמוכר מבקש סטטיסטיקות רק של המוצרים שלו
      });

      if (!stats) {
        // מחזירים אובייקט ריק אם אין עדיין סטטיסטיקות
        return {
          totalViews: 0,
          totalClicks: 0,
          averageViewDuration: 0,
          conversionRate: 0,
          hourlyStats: []
        };
      }

      // עיבוד הנתונים לפורמט שנרצה להציג
      return {
        totalViews: stats.dailyStats.totalViews || 0,
        totalClicks: stats.dailyStats.totalClicks || 0,
        averageViewDuration: stats.dailyStats.averageViewTime || 0,
        conversionRate: stats.dailyStats.totalViews ? 
          (stats.dailyStats.totalClicks / stats.dailyStats.totalViews) * 100 : 0,
        hourlyStats: stats.hourlyStats
      };
    } catch (error) {
      console.error('Error getting product stats:', error);
      throw error;
    }
  }
};
