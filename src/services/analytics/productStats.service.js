/* needed */
// services/analytics/productStats.service.js - גרסה מפושטת
import FullProduct from '../../models/FullProduct.js';
import ProductStats from '../../models/ProductStats.js';

export const ProductStatsService = {
  // תיעוד פתיחת מודל מוצר
  async trackModalOpen(productId, userId = null) {
    try {
      console.log(`[ANALYTICS] Modal opened for product: ${productId}`);
      
      // קבלת vendorId מהמוצר
      const product = await FullProduct.findById(productId);
      if (!product) {
        console.warn(`Product not found for ID: ${productId}`);
        return { success: false };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // עדכון ישיר של פתיחות מודל
      await ProductStats.findOneAndUpdate(
        { productId },
        {
          $setOnInsert: {
            productId,
            vendorId: product.vendorId,
            date: today
          },
          $inc: {
            modalOpens: 1
          },
          $set: {
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );

      console.log(`[ANALYTICS] Modal open tracked successfully for product: ${productId}`);
      return { success: true };
    } catch (error) {
      console.error('[ANALYTICS] Error tracking modal open:', error);
      throw error;
    }
  },

  // תיעוד קליק על קישור אפיליאט
  async trackClick(productId, userId = null) {
    try {
      console.log(`[ANALYTICS] Click tracked for product: ${productId}`);
      
      // קבלת vendorId מהמוצר
      const product = await FullProduct.findById(productId);
      if (!product) {
        console.warn(`Product not found for ID: ${productId}`);
        return { success: false };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // עדכון ישיר של קליקים
      await ProductStats.findOneAndUpdate(
        { productId },
        {
          $setOnInsert: {
            productId,
            vendorId: product.vendorId,
            date: today
          },
          $inc: {
            clicks: 1
          },
          $set: {
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );

      console.log(`[ANALYTICS] Click tracked successfully for product: ${productId}`);
      return { success: true };
    } catch (error) {
      console.error('[ANALYTICS] Error tracking click:', error);
      throw error;
    }
  },
  
  // קבלת סטטיסטיקות למוצר
  async getStats(productId) {
    try {
      const stats = await ProductStats.findOne({ productId });
      
      if (!stats) {
        return {
          modalOpens: 0,
          clicks: 0,
          conversionRate: 0
        };
      }
      
      const conversionRate = stats.modalOpens > 0 
        ? (stats.clicks / stats.modalOpens) * 100 
        : 0;
      
      return {
        modalOpens: stats.modalOpens || 0,
        clicks: stats.clicks || 0,
        conversionRate: Math.round(conversionRate * 100) / 100 // עיגול ל-2 ספרות
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting stats:', error);
      throw error;
    }
  },

  // קבלת סטטיסטיקות למוכר
  async getVendorStats(vendorId) {
    try {
      const stats = await ProductStats.aggregate([
        { $match: { vendorId } },
        {
          $group: {
            _id: null,
            totalModalOpens: { $sum: '$modalOpens' },
            totalClicks: { $sum: '$clicks' },
            totalProducts: { $sum: 1 }
          }
        }
      ]);

      if (!stats.length) {
        return {
          totalModalOpens: 0,
          totalClicks: 0,
          totalProducts: 0,
          averageConversionRate: 0
        };
      }

      const result = stats[0];
      const averageConversionRate = result.totalModalOpens > 0 
        ? (result.totalClicks / result.totalModalOpens) * 100 
        : 0;

      return {
        totalModalOpens: result.totalModalOpens,
        totalClicks: result.totalClicks,
        totalProducts: result.totalProducts,
        averageConversionRate: Math.round(averageConversionRate * 100) / 100
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting vendor stats:', error);
      throw error;
    }
  }
};