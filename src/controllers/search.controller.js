// /* needed */
// // src/controllers/search.controller.js
// import { searchService } from '../services/search/searchService.js';

// export const searchController = {
  
//   /**
//    * חיפוש מוצרים
//    */
//   async searchProducts(req, res) {
//     try {
//       const {
//         q: query = '',
//         categories = [],
//         vendors = [],
//         minPrice,
//         maxPrice,
//         minRating,
//         sort = 'relevance',
//         page = 1,
//         limit = 10
//       } = req.query;
      
//       // המרת פרמטרים למערכים אם נדרש
//       const categoryArray = Array.isArray(categories) ? categories : categories ? [categories] : [];
//       const vendorArray = Array.isArray(vendors) ? vendors : vendors ? [vendors] : [];
      
//       // בניית אובייקט פילטרים
//       const filters = {
//         ...(categoryArray.length && { categories: categoryArray }),
//         ...(vendorArray.length && { vendors: vendorArray }),
//         ...(minPrice && { minPrice }),
//         ...(maxPrice && { maxPrice }),
//         ...(minRating && { minRating })
//       };
      
//       // ביצוע החיפוש
//       const results = await searchService.searchProducts({
//         query,
//         filters,
//         sort,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         userId: req.user?.id
//       });
      
//       res.json(results);
      
//     } catch (error) {
//       console.error('Search products error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בחיפוש מוצרים',
//         error: error.message
//       });
//     }
//   },
  
//   /**
//    * קבלת הצעות חיפוש
//    */
//   async getSuggestions(req, res) {
//     try {
//       const { q: query } = req.query;
      
//       if (!query || query.length < 2) {
//         return res.json({ success: true, suggestions: [] });
//       }
      
//       const suggestions = await searchService.getSearchSuggestions(query);
//       res.json(suggestions);
      
//     } catch (error) {
//       console.error('Get suggestions error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בקבלת הצעות חיפוש',
//         error: error.message
//       });
//     }
//   },
  
//   /**
//    * קבלת קטגוריות דינמיות
//    */
//   async getDynamicCategories(req, res) {
//     try {
//       const categories = await searchService.getDynamicCategories();
//       res.json(categories);
      
//     } catch (error) {
//       console.error('Get categories error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בקבלת קטגוריות',
//         error: error.message
//       });
//     }
//   },
  
//   /**
//    * קבלת רשימת מוכרים
//    */
//   async getVendors(req, res) {
//     try {
//       const vendors = await searchService.getVendorsList();
//       res.json(vendors);
      
//     } catch (error) {
//       console.error('Get vendors error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בקבלת רשימת מוכרים',
//         error: error.message
//       });
//     }
//   },
  
//   /**
//    * קבלת טווח מחירים
//    */
//   async getPriceRange(req, res) {
//     try {
//       const priceRange = await searchService.getPriceRange();
//       res.json(priceRange);
      
//     } catch (error) {
//       console.error('Get price range error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בקבלת טווח מחירים',
//         error: error.message
//       });
//     }
//   },
  
//   /**
//    * חיפוש משולב - endpoint אחד לכל הנתונים
//    */
//   async getSearchData(req, res) {
//     try {
//       const [categories, vendors, priceRange] = await Promise.all([
//         searchService.getDynamicCategories(),
//         searchService.getVendorsList(),
//         searchService.getPriceRange()
//       ]);
      
//       res.json({
//         success: true,
//         data: {
//           categories: categories.categories || [],
//           vendors: vendors.vendors || [],
//           priceRange: priceRange.priceRange || { minPrice: 0, maxPrice: 1000 }
//         }
//       });
      
//     } catch (error) {
//       console.error('Get search data error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'שגיאה בקבלת נתוני חיפוש',
//         error: error.message
//       });
//     }
//   },
  
// };
// src/controllers/search.controller.js - גרסה מתוקנת
import { searchService } from '../services/search/searchService.js';

export const searchController = {
  
  /**
   * חיפוש מוצרים - תומך בפורמטים מרובים
   */
  async searchProducts(req, res) {
    try {
      // 🔧 חילוץ פרמטרים עם תמיכה בפורמטים שונים
      const query = req.query.q || '';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || 'relevance';
      
      // 🔧 טיפול בקטגוריות - תמיכה במערכים ובערכים בודדים
      let categories = [];
      if (req.query.categories) {
        categories = Array.isArray(req.query.categories) ? req.query.categories : [req.query.categories];
      } else if (req.query.category) {
        categories = [req.query.category];
      } else if (req.query['categories[]']) {
        categories = Array.isArray(req.query['categories[]']) ? req.query['categories[]'] : [req.query['categories[]']];
      }
      
      // 🔧 טיפול במוכרים - תמיכה במערכים ובערכים בודדים
      let vendors = [];
      if (req.query.vendors) {
        vendors = Array.isArray(req.query.vendors) ? req.query.vendors : [req.query.vendors];
      } else if (req.query.vendor) {
        vendors = [req.query.vendor];
      } else if (req.query['vendors[]']) {
        vendors = Array.isArray(req.query['vendors[]']) ? req.query['vendors[]'] : [req.query['vendors[]']];
      }
      
      // 🔧 טיפול במחירים
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;
      
      // 🔧 טיפול בדירוג
      const minRating = req.query.minRating ? parseFloat(req.query.minRating) : undefined;
      
      console.log('🔍 פרמטרי חיפוש מעובדים:', {
        query,
        categories,
        vendors,
        minPrice,
        maxPrice,
        minRating,
        sort,
        page,
        limit
      });
      
      // בניית אובייקט פילטרים
      const filters = {};
      
      if (categories.length > 0) {
        filters.categories = categories;
      }
      
      if (vendors.length > 0) {
        filters.vendors = vendors;
      }
      
      if (minPrice !== undefined) {
        filters.minPrice = minPrice;
      }
      
      if (maxPrice !== undefined) {
        filters.maxPrice = maxPrice;
      }
      
      if (minRating !== undefined) {
        filters.minRating = minRating;
      }
      
      // ביצוע החיפוש
      const results = await searchService.searchProducts({
        query,
        filters,
        sort,
        page,
        limit,
        userId: req.user?.id
      });
      
      res.json(results);
      
    } catch (error) {
      console.error('Search products error:', error);
      res.status(500).json({
        success: false,
        message: 'שגיאה בחיפוש מוצרים',
        error: error.message
      });
    }
  },
  
  /**
   * קבלת הצעות חיפוש
   */
  async getSuggestions(req, res) {
    try {
      const { q: query } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({ success: true, suggestions: [] });
      }
      
      const suggestions = await searchService.getSearchSuggestions(query);
      res.json(suggestions);
      
    } catch (error) {
      console.error('Get suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'שגיאה בקבלת הצעות חיפוש',
        error: error.message
      });
    }
  },
  
  /**
   * קבלת קטגוריות דינמיות
   */
  async getDynamicCategories(req, res) {
    try {
      const categories = await searchService.getDynamicCategories();
      res.json(categories);
      
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'שגיאה בקבלת קטגוריות',
        error: error.message
      });
    }
  },
  
  /**
   * קבלת רשימת מוכרים
   */
  async getVendors(req, res) {
    try {
      const vendors = await searchService.getVendorsList();
      res.json(vendors);
      
    } catch (error) {
      console.error('Get vendors error:', error);
      res.status(500).json({
        success: false,
        message: 'שגיאה בקבלת רשימת מוכרים',
        error: error.message
      });
    }
  },
  
  /**
   * קבלת טווח מחירים
   */
  async getPriceRange(req, res) {
    try {
      const priceRange = await searchService.getPriceRange();
      res.json(priceRange);
      
    } catch (error) {
      console.error('Get price range error:', error);
      res.status(500).json({
        success: false,
        message: 'שגיאה בקבלת טווח מחירים',
        error: error.message
      });
    }
  },
  
  /**
   * חיפוש משולב - endpoint אחד לכל הנתונים
   */
  async getSearchData(req, res) {
    try {
      const [categories, vendors, priceRange] = await Promise.all([
        searchService.getDynamicCategories(),
        searchService.getVendorsList(),
        searchService.getPriceRange()
      ]);
      
      res.json({
        success: true,
        data: {
          categories: categories.categories || [],
          vendors: vendors.vendors || [],
          priceRange: priceRange.priceRange || { minPrice: 0, maxPrice: 1000 }
        }
      });
      
    } catch (error) {
      console.error('Get search data error:', error);
      res.status(500).json({
        success: false,
        message: 'שגיאה בקבלת נתוני חיפוש',
        error: error.message
      });
    }
  },
  
};