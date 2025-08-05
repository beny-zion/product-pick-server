/* needed */
// services/analytics/aggregation.service.js - גרסה מפושטת
import mongoose from 'mongoose';
import ProductStats from '../../models/ProductStats.js';

export const AggregationService = {
  // קבלת סטטיסטיקות מוכר
  async getVendorStats(vendorId) {
    try {
      const stats = await ProductStats.aggregate([
        { 
          $match: { 
            vendorId: new mongoose.Types.ObjectId(vendorId)
          }
        },
        {
          $lookup: {
            from: 'fullproducts',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: {
            path: '$product',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: '$productId',
            modalOpens: 1,
            clicks: 1,
            conversionRate: {
              $cond: [
                { $gt: ['$modalOpens', 0] },
                { $multiply: [{ $divide: ['$clicks', '$modalOpens'] }, 100] },
                0
              ]
            },
            productTitle: '$product.title',
            productImage: { $ifNull: ['$product.displayImage', ''] }
          }
        },
        {
          $sort: { modalOpens: -1 }
        }
      ]);

      console.log(`[AGGREGATION] Found ${stats.length} products for vendor ${vendorId}`);
      
      return this._formatVendorStats(stats);
    } catch (error) {
      console.error('[AGGREGATION] Error in getVendorStats:', error);
      throw error;
    }
  },

  // עיצוב תוצאות הסטטיסטיקות
  _formatVendorStats(stats) {
    const totalModalOpens = stats.reduce((sum, stat) => sum + (stat.modalOpens || 0), 0);
    const totalClicks = stats.reduce((sum, stat) => sum + (stat.clicks || 0), 0);
    const averageConversionRate = totalModalOpens > 0 ? (totalClicks / totalModalOpens) * 100 : 0;

    return {
      // סיכום כללי
      totalModalOpens,
      totalClicks,
      averageConversionRate: Math.round(averageConversionRate * 100) / 100,
      totalProducts: stats.length,
      
      // סטטיסטיקות לפי מוצר
      productStats: stats.map(stat => ({
        productId: stat._id,
        productTitle: stat.productTitle || 'ללא כותרת',
        productImage: stat.productImage || '',
        modalOpens: stat.modalOpens || 0,
        clicks: stat.clicks || 0,
        conversionRate: Math.round((stat.conversionRate || 0) * 100) / 100
      }))
    };
  }
};