// /* needed */
// // services/aliexpress/product.service.js
// import axios from 'axios';
// import crypto from 'crypto';
// import { tokenService } from './token.service.js';
// import { config } from "dotenv";
// config();

// const generateSignature = (params) => {
//     // חשוב: שם המתודה צריך להיות חלק מהמחרוזת לחתימה
//     const signStr = Object.entries(params)
//       .sort(([a], [b]) => a.localeCompare(b))
//       .map(([k, v]) => `${k}${v}`)
//       .join('');
    
//     // הורדנו את '/sync' - זה לא חלק מהחתימה
//     return crypto
//       .createHmac('sha256', process.env.ALIEXPRESS_APP_SECRET)
//       .update(signStr)
//       .digest('hex')
//       .toUpperCase();
//   };

//   export const getProductsDetails = async (productIds) => {
//     try {
//       console.log('Getting details for products:', productIds);
//       const token = await tokenService.getValidToken();
      
//       const params = {
//         // תיקון שם המתודה
//         method: 'aliexpress.affiliate.productdetail.get',
//         app_key: process.env.ALIEXPRESS_APP_KEY,
//         access_token: token.access_token,
//         product_ids: Array.isArray(productIds) ? productIds.join(',') : productIds,
//         sign_method: 'sha256',
//         timestamp: Date.now(),
//         target_currency: 'USD',
//         target_language: 'HE'
//       };
  
//       params.sign = generateSignature(params);
  
//       console.log('Request params:', {
//         ...params,
//         access_token: '***hidden***',
//         app_key: '***hidden***',
//         sign: '***hidden***'
//       });
  
//       const response = await axios.post(
//         'https://api-sg.aliexpress.com/sync',
//         null,
//         { params }
//       );
  
//       console.log('Raw API Response:', JSON.stringify(response.data, null, 2));
//       return response.data;
//     } catch (error) {
//       if (error.response) {
//         console.error('API Error Details:', {
//           status: error.response.status,
//           data: error.response.data
//         });
//       }
//       throw error;
//     }
//   };


// export const getRegularProductDetails = async (productId) => {
//     const token = await tokenService.getValidToken();
//   const params = {
//     method: 'aliexpress.ds.product.get',
//     app_key: process.env.ALIEXPRESS_APP_KEY,
//     access_token: token.access_token,
//     product_id: productId,
//     sign_method: 'sha256',
//     timestamp: Date.now(),
//     target_language: 'HE',
//     ship_to_country: 'IL'
//   };

//   params.sign = generateSignature(params);
  
//   const response = await axios.post(
//     'https://api-sg.aliexpress.com/sync',
//     null,
//     { params }
//   );

//   return response.data;
// };
// // כלי עזר לעיבוד התגובה
// const parseProductResponse = (response) => {
//     // const products = response?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product;
    
//     // if (!products) {
//     //   console.log('Raw response:', JSON.stringify(response, null, 2));
//     //   throw new Error('Invalid product response format');
//     // }
//     const currentRecordCount = response?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.current_record_count;
  
//   if (currentRecordCount === 0) {
//     throw new Error('המוצר לא נמצא במערכת AliExpress או שאינו זמין יותר למכירה');
//   }
  
//   const products = response?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product;
  
//   if (!products) {
//     throw new Error('תקלה בקבלת פרטי המוצר מ-AliExpress');
//   }
  
//     return products.map(product => ({
//       productId: product.product_id,
//       title: product.product_title,
//       price: {
//         current: product.target_sale_price,
//         original: product.target_original_price,
//         discount: product.discount
//       },
//       images: {
//         main: product.product_main_image_url,
//         small: product.product_small_image_urls?.string || []
//       },
//       product_video_url: product.product_video_url,
//       links: {
//         detail: product.product_detail_url,
//         promotion: product.promotion_link
//       },
//       stats: {
//         commission: product.commission_rate,
//         sales: product.lastest_volume,
//         rating: product.evaluate_rate
//       },
//       categories: {
//         main: {
//           id: product.first_level_category_id,
//           name: product.first_level_category_name
//         },
//         sub: {
//           id: product.second_level_category_id,
//           name: product.second_level_category_name
//         }
//       }
//     }));
//   };

// export const productService = {
//   getProductsDetails,
//   parseProductResponse,
//     getRegularProductDetails,
//     generateSignature
// };
/* needed */
// services/aliexpress/product.service.js - גרסה מתוקנת
import axios from 'axios';
import crypto from 'crypto';
import { tokenService } from './token.service.js';
import { config } from "dotenv";
config();

const generateSignature = (params) => {
    const signStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}${v}`)
      .join('');
    
    return crypto
      .createHmac('sha256', process.env.ALIEXPRESS_APP_SECRET)
      .update(signStr)
      .digest('hex')
      .toUpperCase();
  };

  export const getProductsDetails = async (productIds) => {
    try {
      console.log('Getting details for products:', productIds);
      const token = await tokenService.getValidToken();
      
      const params = {
        method: 'aliexpress.affiliate.productdetail.get',
        app_key: process.env.ALIEXPRESS_APP_KEY,
        access_token: token.access_token,
        product_ids: Array.isArray(productIds) ? productIds.join(',') : productIds,
        sign_method: 'sha256',
        timestamp: Date.now(),
        target_currency: 'USD',
        target_language: 'HE'
      };
  
      params.sign = generateSignature(params);
  
      console.log('Request params:', {
        ...params,
        access_token: '***hidden***',
        app_key: '***hidden***',
        sign: '***hidden***'
      });
  
      const response = await axios.post(
        'https://api-sg.aliexpress.com/sync',
        null,
        { params }
      );
  
      console.log('Raw API Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error('API Error Details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  };

export const getRegularProductDetails = async (productId) => {
    const token = await tokenService.getValidToken();
  const params = {
    method: 'aliexpress.ds.product.get',
    app_key: process.env.ALIEXPRESS_APP_KEY,
    access_token: token.access_token,
    product_id: productId,
    sign_method: 'sha256',
    timestamp: Date.now(),
    target_language: 'HE',
    ship_to_country: 'IL'
  };

  params.sign = generateSignature(params);
  
  const response = await axios.post(
    'https://api-sg.aliexpress.com/sync',
    null,
    { params }
  );

  return response.data;
};

// 🔧 תיקון parseProductResponse - המרה ל-String
const parseProductResponse = (response) => {
    const currentRecordCount = response?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.current_record_count;
  
  if (currentRecordCount === 0) {
    throw new Error('המוצר לא נמצא במערכת AliExpress או שאינו זמין יותר למכירה');
  }
  
  const products = response?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product;
  
  if (!products) {
    throw new Error('תקלה בקבלת פרטי המוצר מ-AliExpress');
  }
  
    return products.map(product => ({
      // 🔧 המרה ל-String כדי להתאים למודל MongoDB
      productId: String(product.product_id),
      title: product.product_title,
      price: {
        current: product.target_sale_price,
        original: product.target_original_price,
        discount: product.discount
      },
      images: {
        main: product.product_main_image_url,
        small: product.product_small_image_urls?.string || []
      },
      product_video_url: product.product_video_url,
      links: {
        detail: product.product_detail_url,
        promotion: product.promotion_link
      },
      stats: {
        commission: product.commission_rate,
        sales: product.lastest_volume,
        rating: product.evaluate_rate
      },
      categories: {
        main: {
          // 🔧 המרה ל-String גם לקטגוריות
          id: String(product.first_level_category_id || ''),
          name: product.first_level_category_name
        },
        sub: {
          // 🔧 המרה ל-String גם לקטגוריות
          id: String(product.second_level_category_id || ''),
          name: product.second_level_category_name
        }
      }
    }));
  };

export const productService = {
  getProductsDetails,
  parseProductResponse,
  getRegularProductDetails,
  generateSignature
};