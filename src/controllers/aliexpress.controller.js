/* needed??? */
// controllers/aliexpress.controller.js
import { productService } from '../services/aliexpress/product.service.js';
import { tokenService } from '../services/aliexpress/token.service.js';
import { AliexpressToken } from '../models/AliexpressToken.js';
import axios from 'axios';

export const aliexpressController = {
    // Manual token refresh endpoint
    async refreshToken(req, res) {
      try {
        const token = await tokenService.getValidToken();
        res.json({ 
          success: true, 
          expires_at: token.expires_at,
          message: 'Token refreshed successfully'
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    },
  
    // Get token status endpoint
    async getTokenStatus(req, res) {
      try {
        const token = await AliexpressToken.findOne().sort({ expires_at: -1 });
        if (!token) {
          return res.status(404).json({
            success: false,
            message: 'No token found'
          });
        }
  
        res.json({
          success: true,
          data: {
            expires_at: token.expires_at,
            refresh_expires_at: token.refresh_expires_at,
            is_expired: token.isExpired()
          }
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    }
  };


export const validateProduct = async (req, res) => {
    try {
      const { url } = req.body;
      console.log("url: ",url)
      
      // Extract product ID
      const productId = await extractProductId(url);
        console.log("productId: ",productId)
      if (!productId) {
        console.log("Invalid AliExpress URL")
        return res.status(400).json({
          success: false,
          message: 'Invalid AliExpress URL'
        });
      }
  
      // Get product details from AliExpress
    //   const productDetails = await productService.getRegularProductDetails(productId);
      const productDetails = await productService.getProductsDetails(productId);
      console.log("productDetails: ",productDetails)
      const parsedProduct = productService.parseProductResponse(productDetails)[0];
      console.log('parsedProduct:', JSON.stringify(parsedProduct, null, 2));
      
      // Check if affiliate link
      const isAffiliate = url.includes('s.click.aliexpress.com');
  
      res.json({
        success: true,
        data: {
          ...parsedProduct,
          isAffiliate
        }
      });
    } catch (error) {
      console.error('Product validation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to validate product'
      });
    }
  };
  
  const extractProductId = async (url) => {
    try {
      console.log('Processing URL:', url);
      
      if (url.includes('s.click.aliexpress.com')) {
        console.log('Affiliate URL detected, following redirect...');
        const response = await axios.get(url, {
          maxRedirects: 0,
          validateStatus: (status) => status === 302
        });
        url = response.headers.location;
        console.log('Redirected to:', url);
      }
  
      const matches = url.match(/\/(\d+)\.html/) || 
                     url.match(/item\/(\d+)/);
      const productId = matches ? matches[1] : null;
      console.log('Extracted Product ID:', productId);
      
      return productId;
    } catch (err) {
      console.error('Error extracting product ID:', err);
      return null;
    }
  };


// export const aliexpressController = {
//     // בדיקת חיבור
//     async testConnection(req, res) {
//         try {
//             console.log('Testing AliExpress connection...');

//             // const result = await aliExpressService.testConnection();

//             console.log('Connection test successful:', {
//                 success: true,
//                 hasData: !!result
//             });

//             res.json({
//                 success: true,
//                 message: 'AliExpress connection successful',
//                 data: result
//             });

//         } catch (error) {
//             console.error('Connection test failed:', {
//                 message: error.message,
//                 stack: error.stack
//             });

//             res.status(500).json({
//                 success: false,
//                 message: 'AliExpress connection failed',
//                 error: error.message
//             });
//         }
//     }
// };

// export const handleAliexpressCallback = async (req, res) => {
//     try {
//         const code = req.query.code;
//         console.log('Received authorization code:', code);
//         // TODO: Exchange code for access token
//         res.status(200).send('Authorization successful');
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

// const generateSignature = (params, secret) => {
//     const signStr = '/auth/token/create' + Object.entries(params)
//         .sort(([a], [b]) => a.localeCompare(b))
//         .map(([k, v]) => `${k}${v}`)
//         .join('');
//     return crypto.createHmac('sha256', secret).update(signStr).digest('hex').toUpperCase();
// };

// const getAccessToken = async (code) => {
//     const params = {
//         app_key: process.env.ALIEXPRESS_APP_KEY,
//         code,
//         sign_method: 'sha256',
//         timestamp: Date.now()
//     };
//     params.sign = generateSignature(params, process.env.ALIEXPRESS_APP_SECRET);
//     // cnsole.log('Getting access token with params:', params);
//     return axios.post('https://api-sg.aliexpress.com/rest/auth/token/create', null, { params });
// };

// export const handleCallback = async (req, res) => {
//     try {
//       const { code } = req.query;
//     //   cnsole.log('Received authorization code:', code);
//       const tokenResponse = await getAccessToken(code);
      
//       const NewAliexpressToken = await AliexpressToken.create({
//         access_token: tokenResponse.data.access_token,
//         refresh_token: tokenResponse.data.refresh_token,
//         expires_at: new Date(Date.now() + tokenResponse.data.expires_in * 1000),
//         refresh_expires_at: new Date(Date.now() + tokenResponse.data.refresh_expires_in * 1000)
//       });
//     //   cnsole.log('New Aliexpress token:', NewAliexpressToken);
//       res.json({ success: true });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   };

//   export const getProducts = async (req, res) => {
//     try {
//         const params = {
//             method: 'aliexpress.affiliate.product.query',
//             app_key: process.env.ALIEXPRESS_APP_KEY,
//             access_token: '50000801225qjYYxgvFHwAyql9hbUBPwXGkmu102a0c43L0lV1Bg4lTvbuubHdPAMJYi',
//             keywords: req.query.keywords,
//             page_size: 20,
//             timestamp: Date.now(), // הוספת timestamp
//             sign_method: 'sha256'
//         };
 
//         // יצירת חתימה
//         const signStr = Object.entries(params)
//             .sort(([a], [b]) => a.localeCompare(b))
//             .map(([k, v]) => `${k}${v}`)
//             .join('');
        
//         params.sign = crypto
//             .createHmac('sha256', process.env.ALIEXPRESS_APP_SECRET)
//             .update(signStr)
//             .digest('hex')
//             .toUpperCase();
 
//         const response = await axios.post('https://api-sg.aliexpress.com/sync', null, { params });
//         res.json(response.data);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
//  };
// const extractProductData = (product) => ({
//     id: product.product_id,
//     title: product.product_title,
//     price: product.target_app_sale_price,
//     image: product.product_main_image_url,
//     url: product.promotion_link,
//     commission: product.commission_rate
// });

// const getAliexpressProducts = async () => {
//     try {
//         const response = await getProducts();
//         const products = response.data.aliexpress_affiliate_product_query_response.resp_result.result.products;
//         return products.map(extractProductData);
//     } catch (error) {
//         console.error('Error:', error);
//         throw error;
//     }
// };