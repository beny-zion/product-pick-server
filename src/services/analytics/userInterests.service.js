// services/analytics/userInterests.service.js
import UserInterests from '../../models/UserInterests.js';
import Product from '../../models/Product.js';
import mongoose from 'mongoose';

export const UserInterestsService = {
  async trackView(userId, productId) {
    try {
      const product = await Product.findById(productId);
      if (!product?.mainCategory?.length) {
        console.log('No categories for product:', productId);
        return;
      }

      // מעבר על כל הקטגוריות של המוצר
      for (const categoryId of product.mainCategory) {
        await UserInterests.findOneAndUpdate(
          { userId },
          {
            $push: {
              categories: {
                $each: [{
                  categoryId: categoryId,
                  viewCount: 1,
                  clickCount: 0,
                  lastInteraction: new Date()
                }],
                $position: 0
              }
            },
            $set: { lastUpdated: new Date() }
          },
          { upsert: true, new: true }
        );
      }
    } catch (error) {
      console.error('Error in trackView:', error);
    }
  },

  async trackClick(userId, productId) {
    try {
      const product = await Product.findById(productId);
      if (!product?.mainCategory?.length) {
        console.log('No categories for product:', productId);
        return;
      }

      // מעבר על כל הקטגוריות של המוצר
      for (const categoryId of product.mainCategory) {
        await UserInterests.findOneAndUpdate(
          { userId },
          {
            $push: {
              categories: {
                $each: [{
                  categoryId: categoryId,
                  viewCount: 0,
                  clickCount: 1,
                  lastInteraction: new Date()
                }],
                $position: 0
              }
            },
            $set: { lastUpdated: new Date() }
          },
          { upsert: true, new: true }
        );
      }
    } catch (error) {
      console.error('Error in trackClick:', error);
    }
  },

  async getUserInterests(userId) {
    try {
      const interests = await UserInterests.findOne({ userId })
        .populate('categories.categoryId')
        .lean();

      if (!interests) {
        return {
          categories: [],
          recentSearches: []
        };
      }

      // מיון וחישוב ציונים
      const scoredCategories = interests.categories
        .filter(cat => cat.categoryId)
        .map(cat => ({
          ...cat,
          score: this._calculateInterestScore(cat)
        }))
        .sort((a, b) => b.score - a.score);

      return {
        categories: scoredCategories,
        recentSearches: interests.recentSearches || []
      };
    } catch (error) {
      console.error('Error getting user interests:', error);
      return {
        categories: [],
        recentSearches: []
      };
    }
  },

  _calculateInterestScore(category) {
    const daysSinceLastInteraction = 
      (Date.now() - new Date(category.lastInteraction)) / (1000 * 60 * 60 * 24);
    
    const recencyFactor = Math.max(0, 1 - (daysSinceLastInteraction / 30));
    
    return (
      (category.viewCount + category.clickCount * 5) * 
      recencyFactor
    );
  }
};