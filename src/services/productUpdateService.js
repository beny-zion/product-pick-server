/* needed */
import FullProduct from '../models/FullProduct.js';
import { productService } from '../services/aliexpress/product.service.js';

export const updateAllProducts = async () => {
  console.log('[FullProduct Update] Starting scheduled update...');
  let updatedCount = 0;
  let deactivatedCount = 0;
  
  try {
    // שליפת כל המוצרים הפעילים
    const activeProducts = await FullProduct.find({ status: 'ACTIVE' });
    console.log(`[FullProduct Update] Found ${activeProducts.length} active products to update`);
    
    for (const product of activeProducts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 שניות
        // בדיקת זמינות המוצר באלי אקספרס
        const details = await productService.getProductsDetails(product.aliExpressProductId);
        const parsedProduct = productService.parseProductResponse(details)[0];        
        if (!parsedProduct) {
          // אם המוצר לא נמצא, סמן אותו כלא פעיל
          product.status = 'INACTIVE';
          deactivatedCount++;
        } else {
          // עדכון נתוני המוצר
          product.aliExpressData = {
            price: parseFloat(parsedProduct.price.current),
            originalPrice: parseFloat(parsedProduct.price.original),
            discount: parsedProduct.price.discount,
            categories: parsedProduct.categories,
            stats: parsedProduct.stats,
            lastChecked: new Date()
          };
          
          // אם לא מדובר בלינק של המשתמש, עדכן את הלינק השיווקי
          if (!product.isCustomAffiliateLink) {
            product.affiliateLink = parsedProduct.links.promotion;
          }
          
          updatedCount++;
        }
        
        await product.save();
      } catch (error) {
        console.error(`[FullProduct Update] Error updating product ${product._id}:`, error);
      }
    }
    
    console.log(`[FullProduct Update] Complete: ${updatedCount} products updated, ${deactivatedCount} deactivated`);
  } catch (error) {
    console.error('[FullProduct Update] Error during update process:', error);
  }
};