/* needed */
// src/services/search/searchService.js - UPDATED VERSION (With vendor bio)
import FullProduct from '../../models/FullProduct.js';
import User from '../../models/User.js';
import mongoose from 'mongoose';
import NodeCache from 'node-cache';

// Cache configuration
const cache = new NodeCache({ 
  stdTTL: 1800, // 30 minutes default
  checkperiod: 120 // Check for expired keys every 2 minutes
});

export class SearchService {
  /**
   * חיפוש מוצרים עקבי - רק regex search
   */
  async searchProducts({
    query = '',
    filters = {},
    sort = 'relevance',
    page = 1,
    limit = 10,
    userId = null
  }) {
    try {
      const skip = (page - 1) * limit;
      const pipeline = [];
      
      console.log('🔍 מתחיל חיפוש עם:', { query, filters, sort, page, limit });
      
      // שלב 1: בניית match stage מאוחד
      const matchStage = { status: 'ACTIVE' };
      
      // חיפוש טקסט - רק regex search
      if (query?.trim()) {
        console.log('🔍 מחפש עבור:', query);
        
        matchStage.$or = [
          { title: { $regex: query, $options: 'i' } },
          { 'aliExpressData.categories.main.name': { $regex: query, $options: 'i' } },
          { 'aliExpressData.categories.sub.name': { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ];
      }
      
      // פילטר קטגוריות
      if (filters.categories?.length) {
        const categoryIds = filters.categories.map(id => String(id));
        
        const categoryFilter = {
          $or: [
            { 'aliExpressData.categories.main.id': { $in: categoryIds } },
            { 'aliExpressData.categories.sub.id': { $in: categoryIds } }
          ]
        };
        
        if (matchStage.$or) {
          matchStage.$and = [
            { $or: matchStage.$or },
            categoryFilter
          ];
          delete matchStage.$or;
        } else {
          matchStage.$or = categoryFilter.$or;
        }
      }
      
      // פילטר מוכרים
      if (filters.vendors?.length) {
        const vendorIds = filters.vendors.map(id => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch (error) {
            console.warn('Invalid vendor ID:', id);
            return null;
          }
        }).filter(Boolean);
        
        if (vendorIds.length > 0) {
          matchStage.vendorId = { $in: vendorIds };
        }
      }
      
      // פילטר מחיר
      if (filters.minPrice || filters.maxPrice) {
        matchStage['aliExpressData.price'] = {};
        if (filters.minPrice) {
          matchStage['aliExpressData.price'].$gte = parseFloat(filters.minPrice);
        }
        if (filters.maxPrice) {
          matchStage['aliExpressData.price'].$lte = parseFloat(filters.maxPrice);
        }
      }
      
      pipeline.push({ $match: matchStage });
      
      // המרת rating למספר אם צריך
      if (filters.minRating || sort === 'rating') {
        pipeline.push({
          $addFields: {
            numericRating: {
              $convert: {
                input: {
                  $cond: {
                    if: { $eq: [{ $type: '$aliExpressData.stats.rating' }, 'string'] },
                    then: {
                      $substr: ['$aliExpressData.stats.rating', 0, {
                        $cond: {
                          if: { $gte: [{ $indexOfCP: ['$aliExpressData.stats.rating', '%'] }, 0] },
                          then: { $indexOfCP: ['$aliExpressData.stats.rating', '%'] },
                          else: { $strLenCP: '$aliExpressData.stats.rating' }
                        }
                      }]
                    },
                    else: '$aliExpressData.stats.rating'
                  }
                },
                to: 'double',
                onError: 0,
                onNull: 0
              }
            }
          }
        });
        
        if (filters.minRating) {
          pipeline.push({
            $match: {
              numericRating: { $gte: parseFloat(filters.minRating) }
            }
          });
        }
      }
      
      // מיון
      const sortStage = this.buildSimpleSortStage(sort, query);
      pipeline.push({ $sort: sortStage });
      
      // facet לספירה וחיתוך
      pipeline.push({
        $facet: {
          products: [
            { $skip: skip },
            { $limit: limit },
            // lookup מוכר עם טיפול בטוח
            {
              $lookup: {
                from: 'users',
                let: { vendorId: '$vendorId' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$vendorId'] } } },
                  { $project: { fullName: 1, profileImage: 1, bio: 1 } }
                ],
                as: 'vendorData'
              }
            },
            // טיפול בטוח במוכר
            {
              $addFields: {
                vendorId: {
                  $cond: {
                    if: { $gt: [{ $size: '$vendorData' }, 0] },
                    then: {
                      _id: { $arrayElemAt: ['$vendorData._id', 0] },
                      fullName: { $arrayElemAt: ['$vendorData.fullName', 0] },
                      profileImage: { $arrayElemAt: ['$vendorData.profileImage', 0] },
                      bio: { $arrayElemAt: ['$vendorData.bio', 0] }
                    },
                    else: {
                      _id: '$vendorId',
                      fullName: 'מוכר לא ידוע',
                      profileImage: null,
                      bio: null
                    }
                  }
                }
              }
            },
            { 
              $project: { 
                vendorData: 0, 
                numericRating: 0 
              } 
            }
          ],
          totalCount: [
            { $count: 'total' }
          ]
        }
      });
      
      const results = await FullProduct.aggregate(pipeline);
      
      const products = results[0].products || [];
      const totalProducts = results[0].totalCount[0]?.total || 0;
      
      console.log(`📦 נמצאו ${products.length} מוצרים מתוך ${totalProducts} בסך הכל`);
      
      if (userId && query) {
        this.saveSearchHistory(userId, query).catch(console.error);
      }
      
      return {
        success: true,
        products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts,
          hasMore: page * limit < totalProducts
        },
        appliedFilters: filters,
        searchQuery: query
      };
      
    } catch (error) {
      console.error('❌ Search error:', error);
      return {
        success: false,
        products: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalProducts: 0,
          hasMore: false
        },
        appliedFilters: filters,
        searchQuery: query,
        error: error.message
      };
    }
  }
  
  /**
   * קבלת הצעות חיפוש מעודכנות
   */
  async getSearchSuggestions(query, limit = 5) {
    if (!query || query.length < 2) {
      return { success: true, suggestions: [] };
    }
    
    try {
      const cacheKey = `suggestions:${query}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, suggestions: cached };
      }
      
      console.log('💡 מחפש הצעות עבור:', query);
      
      const suggestions = await FullProduct.aggregate([
        {
          $facet: {
            // מוצרים
            products: [
              { 
                $match: { 
                  status: 'ACTIVE',
                  $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { 'aliExpressData.categories.main.name': { $regex: query, $options: 'i' } }
                  ]
                }
              },
              { $limit: limit },
              {
                $project: {
                  type: { $literal: 'product' },
                  text: '$title',
                  id: '$_id',
                  category: '$aliExpressData.categories.main.name'
                }
              }
            ],
            // 🆕 מוכרים עם bio
            vendors: [
              {
                $lookup: {
                  from: 'users',
                  pipeline: [
                    {
                      $match: {
                        isVendor: true,
                        fullName: { $regex: query, $options: 'i' }
                      }
                    },
                    { $limit: limit },
                    {
                      $project: {
                        type: { $literal: 'vendor' },
                        text: '$fullName',
                        id: '$_id',
                        image: '$profileImage',
                        bio: '$bio'
                      }
                    }
                  ],
                  as: 'vendorResults'
                }
              },
              { $unwind: { path: '$vendorResults', preserveNullAndEmptyArrays: false } },
              { $replaceRoot: { newRoot: '$vendorResults' } },
              { $limit: limit }
            ],
            // קטגוריות
            categories: [
              {
                $match: {
                  status: 'ACTIVE',
                  'aliExpressData.categories.main.name': { $regex: query, $options: 'i' }
                }
              },
              {
                $group: {
                  _id: '$aliExpressData.categories.main.name',
                  count: { $sum: 1 }
                }
              },
              { $match: { count: { $gte: 1 } } },
              { $limit: 3 },
              {
                $project: {
                  type: { $literal: 'search' },
                  text: '$_id',
                  category: '$_id'
                }
              }
            ]
          }
        },
        {
          $project: {
            suggestions: { 
              $slice: [
                { 
                  $concatArrays: [
                    [{
                      type: 'search',
                      text: query,
                      highlight: true
                    }],
                    '$products', 
                    '$vendors',
                    '$categories'
                  ]
                },
                limit + 3
              ]
            }
          }
        }
      ]);
      
      const allSuggestions = suggestions[0]?.suggestions || [
        {
          type: 'search',
          text: query,
          highlight: true
        }
      ];
      
      cache.set(cacheKey, allSuggestions, 600);
      
      return {
        success: true,
        suggestions: allSuggestions
      };
      
    } catch (error) {
      console.error('❌ Suggestions error:', error);
      return { 
        success: true, 
        suggestions: [{
          type: 'search',
          text: query,
          highlight: true
        }]
      };
    }
  }
  
  /**
   * קבלת קטגוריות דינמיות
   */
  async getDynamicCategories() {
    try {
      const cacheKey = 'categories:dynamic';
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, categories: cached };
      }
      
      const categories = await FullProduct.aggregate([
        { 
          $match: { 
            status: 'ACTIVE',
            'aliExpressData.categories.main.id': { $exists: true, $ne: null },
            'aliExpressData.categories.main.name': { $exists: true, $ne: null }
          } 
        },
        { 
          $group: {
            _id: '$aliExpressData.categories.main.id',
            name: { $first: '$aliExpressData.categories.main.name' },
            count: { $sum: 1 }
          }
        },
        { $match: { _id: { $ne: null }, name: { $ne: null } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        {
          $project: {
            id: '$_id',
            name: 1,
            count: 1,
            _id: 0
          }
        }
      ]);
      
      const categoryIcons = {
        'Electronics': '📱',
        'אלקטרוניקה': '📱',
        'Fashion': '👕',
        'אופנה': '👕',
        'Home': '🏠',
        'בית': '🏠',
        'Beauty': '💄',
        'יופי': '💄',
        'יופי ובריאות': '💄',
        'Health': '🏥',
        'בריאות': '🏥',
        'Sports': '⚽',
        'ספורט': '⚽',
        'Toys': '🧸',
        'צעצועים': '🧸',
        'צעצועים ותחביבים': '🧸',
        'Automotive': '🚗',
        'מכוניות ואופנועים': '🚗',
        'רכב': '🚗',
        'Garden': '🌱',
        'גינה': '🌱',
        'בית וגן': '🌱',
        'מכשירי חשמל לבית': '🔌',
        'שיפוץ בית': '🔨',
        'כלים': '🔧',
        'מוצרי אלקטרוניקה': '📱',
        'שעונים': '⌚',
        'default': '📦'
      };
      
      const processedCategories = categories.map(cat => ({
        id: String(cat.id),
        name: cat.name,
        count: cat.count,
        icon: categoryIcons[cat.name] || categoryIcons.default
      }));
      
      cache.set(cacheKey, processedCategories, 1800);
      
      return {
        success: true,
        categories: processedCategories
      };
      
    } catch (error) {
      console.error('❌ Categories error:', error);
      return { success: false, categories: [] };
    }
  }
  
  /**
   * 🆕 קבלת רשימת מוכרים עם bio
   */
  async getVendorsList() {
    try {
      const cacheKey = 'vendors:list';
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, vendors: cached };
      }
      
      const vendors = await FullProduct.aggregate([
        { $match: { status: 'ACTIVE' } },
        {
          $group: {
            _id: '$vendorId',
            productCount: { $sum: 1 },
            avgRating: { 
              $avg: {
                $convert: {
                  input: {
                    $cond: {
                      if: { $eq: [{ $type: '$aliExpressData.stats.rating' }, 'string'] },
                      then: {
                        $substr: ['$aliExpressData.stats.rating', 0, {
                          $cond: {
                            if: { $gte: [{ $indexOfCP: ['$aliExpressData.stats.rating', '%'] }, 0] },
                            then: { $indexOfCP: ['$aliExpressData.stats.rating', '%'] },
                            else: { $strLenCP: '$aliExpressData.stats.rating' }
                          }
                        }]
                      },
                      else: '$aliExpressData.stats.rating'
                    }
                  },
                  to: 'double',
                  onError: 0,
                  onNull: 0
                }
              }
            }
          }
        },
        { $match: { productCount: { $gte: 1 } } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        { $unwind: '$vendorInfo' },
        {
          $project: {
            _id: 1,
            fullName: '$vendorInfo.fullName',
            profileImage: '$vendorInfo.profileImage',
            bio: '$vendorInfo.bio',
            productCount: 1,
            avgRating: { $round: ['$avgRating', 1] }
          }
        },
        { $sort: { productCount: -1 } },
        { $limit: 50 }
      ]);
      
      cache.set(cacheKey, vendors);
      
      return {
        success: true,
        vendors
      };
      
    } catch (error) {
      console.error('❌ Vendors error:', error);
      return { success: false, vendors: [] };
    }
  }
  
  /**
   * קבלת טווח מחירים
   */
  async getPriceRange() {
    try {
      const cacheKey = 'price:range';
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, priceRange: cached };
      }
      
      const result = await FullProduct.aggregate([
        { $match: { status: 'ACTIVE', 'aliExpressData.price': { $gt: 0 } } },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$aliExpressData.price' },
            maxPrice: { $max: '$aliExpressData.price' },
            avgPrice: { $avg: '$aliExpressData.price' }
          }
        }
      ]);
      
      const priceRange = result[0] || { minPrice: 0, maxPrice: 1000, avgPrice: 500 };
      
      priceRange.minPrice = Math.floor(priceRange.minPrice);
      priceRange.maxPrice = Math.ceil(priceRange.maxPrice);
      priceRange.avgPrice = Math.round(priceRange.avgPrice);
      
      cache.set(cacheKey, priceRange, 3600);
      
      return {
        success: true,
        priceRange
      };
      
    } catch (error) {
      console.error('❌ Price range error:', error);
      return { success: false, priceRange: { minPrice: 0, maxPrice: 1000 } };
    }
  }
  
  /**
   * בניית שלב מיון פשוט
   */
  buildSimpleSortStage(sort, hasSearchQuery) {
    const sortStage = {};
    
    switch (sort) {
      case 'relevance':
        if (hasSearchQuery) {
          sortStage.createdAt = -1;
        } else {
          sortStage.createdAt = -1;
        }
        break;
        
      case 'price_asc':
        sortStage['aliExpressData.price'] = 1;
        break;
        
      case 'price_desc':
        sortStage['aliExpressData.price'] = -1;
        break;
        
      case 'newest':
        sortStage.createdAt = -1;
        break;
        
      case 'popular':
        sortStage['aliExpressData.stats.sales'] = -1;
        sortStage.createdAt = -1;
        break;
        
      case 'rating':
        sortStage.numericRating = -1;
        sortStage['aliExpressData.stats.sales'] = -1;
        break;
        
      default:
        sortStage.createdAt = -1;
    }
    
    return sortStage;
  }
  
  /**
   * שמירת היסטוריית חיפוש
   */
  async saveSearchHistory(userId, query) {
    try {
      // TODO: Implement search history model
    } catch (error) {
      console.error('❌ Save history error:', error);
    }
  }
  
  /**
   * ניקוי cache
   */
  clearCache() {
    cache.flushAll();
  }
}

export const searchService = new SearchService();