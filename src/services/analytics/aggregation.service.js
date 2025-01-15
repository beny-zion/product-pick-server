// services/aggregation.service.js
import mongoose from 'mongoose';
import ProductStats from '../../models/ProductStats.js';

export const AggregationService = {
  async getVendorStats(vendorId, period = 'week') {
    try {
      console.log("!!!!!!!!!");
      
      // תחילה נבדוק אם יש בכלל סטטיסטיקות למוכר
      const hasStats = await ProductStats.exists({ vendorId: new mongoose.Types.ObjectId(vendorId) });
      
      if (!hasStats) {
        console.log("No stats found for vendor");
        // מחזירים אובייקט ריק עם ערכי ברירת מחדל
        return {
          totalViews: 0,
          totalClicks: 0,
          averageViewDuration: 0,
          conversionRate: 0,
          productStats: []
        };
      }

      const periodFilter = this._getPeriodFilter(period);
      
      const stats = await ProductStats.aggregate([
        { 
          $match: { 
            vendorId: new mongoose.Types.ObjectId(vendorId)
            // הסרת התנאי על hourlyStats.date כי הוא גורם לבעיות
          }
        },
        {
          $group: {
            _id: '$productId',
            totalViews: { 
              $sum: { 
                $ifNull: ['$dailyStats.totalViews', 0] 
              }
            },
            totalClicks: { 
              $sum: { 
                $ifNull: ['$dailyStats.totalClicks', 0] 
              }
            },
            averageViewDuration: { 
              $avg: { 
                $ifNull: ['$dailyStats.averageViewTime', 0] 
              }
            }
          }
        }
      ]);

      console.log("Stats found:", this._formatStats(stats));
      
      return this._formatStats(stats);
    } catch (error) {
      console.error("Error in getVendorStats:", error);
      throw error;
    }
  },

  _getPeriodFilter(period) {
    const now = new Date();
    switch (period) {
      case 'day':
        return { $gte: new Date(now.setDate(now.getDate() - 1)) };
      case 'week':
        return { $gte: new Date(now.setDate(now.getDate() - 7)) };
      case 'month':
        return { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
      default:
        return { $gte: new Date(now.setDate(now.getDate() - 7)) };
    }
  },

  _formatStats(stats) {
    return {
      totalViews: stats.reduce((sum, stat) => sum + stat.totalViews, 0),
      totalClicks: stats.reduce((sum, stat) => sum + stat.totalClicks, 0),
      averageViewDuration: stats.reduce((sum, stat) => sum + stat.averageViewDuration, 0) / stats.length,
      conversionRate: this._calculateConversionRate(stats),
      productStats: stats
    };
  },

  _calculateConversionRate(stats) {
    const totalViews = stats.reduce((sum, stat) => sum + stat.totalViews, 0);
    const totalClicks = stats.reduce((sum, stat) => sum + stat.totalClicks, 0);
    return totalViews ? (totalClicks / totalViews) * 100 : 0;
  }
};