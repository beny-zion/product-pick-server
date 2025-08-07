/* needed */
// controllers/aliexpress.controller.js
import { productService } from '../services/aliexpress/product.service.js';
import { tokenService } from '../services/aliexpress/token.service.js';
import { AliexpressToken } from '../models/AliexpressToken.js';
import axios from 'axios';
import crypto from 'crypto';

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

// 🆕 פונקציה ליצירת קישור אימות
export const initiateAuth = async (req, res) => {
  try {
    const timestamp = Date.now();
    const authUrl = `https://api-sg.aliexpress.com/rest/auth/authorize?` +
      `response_type=code&` +
      `app_key=${process.env.ALIEXPRESS_APP_KEY}&` +
      `redirect_uri=${encodeURIComponent('https://product-pick-server.onrender.com/api/aliexpress/callback')}&` +
      `state=auth_state_123&` +
      `timestamp=${timestamp}`;
    
    console.log('Created auth URL:', authUrl);
    
    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Visit this URL to authorize the application',
      instructions: 'Copy the authUrl and open it in your browser to authorize'
    });
  } catch (error) {
    console.error('Auth URL creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🆕 פונקציה ליצירת חתימה
const generateSignature = (params, secret) => {
    const signStr = '/auth/token/create' + Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}${v}`)
        .join('');
    return crypto.createHmac('sha256', secret).update(signStr).digest('hex').toUpperCase();
};

// 🆕 פונקציה לקבלת טוקן מקוד
const getAccessToken = async (code) => {
    const params = {
        app_key: process.env.ALIEXPRESS_APP_KEY,
        code,
        sign_method: 'sha256',
        timestamp: Date.now()
    };
    params.sign = generateSignature(params, process.env.ALIEXPRESS_APP_SECRET);
    
    console.log('Getting access token with params:', {
        app_key: params.app_key,
        code: code?.substring(0, 10) + '...',
        sign_method: params.sign_method,
        timestamp: params.timestamp,
        sign: '***hidden***'
    });
    
    return axios.post('https://api-sg.aliexpress.com/rest/auth/token/create', null, { params });
};

// 🆕 פונקציה לטיפול ב-callback מאלי אקספרס
export const handleCallback = async (req, res) => {
    try {
      const { code, state } = req.query;
      console.log('Received authorization code:', code?.substring(0, 10) + '...');
      console.log('State:', state);
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'No authorization code received'
        });
      }
      
      // מחליף את הקוד בטוקן
      const tokenResponse = await getAccessToken(code);
      console.log('Token response received');
      
      // מוחק טוכן ישן אם קיים
      await AliexpressToken.deleteMany({});
      console.log('Old tokens deleted');
      
      // שומר טוכן חדש
      const newAliexpressToken = await AliexpressToken.create({
        access_token: tokenResponse.data.access_token,
        refresh_token: tokenResponse.data.refresh_token,
        expires_at: new Date(Date.now() + tokenResponse.data.expires_in * 1000),
        refresh_expires_at: new Date(Date.now() + tokenResponse.data.refresh_expires_in * 1000)
      });
      
      console.log('New AliExpress token saved successfully');
      console.log('Token expires at:', newAliexpressToken.expires_at);
      
      // החזרת תגובה מוצלחת
      res.json({ 
        success: true,
        message: '🎉 Authorization successful! You can now use AliExpress API',
        token_info: {
          expires_at: newAliexpressToken.expires_at,
          refresh_expires_at: newAliexpressToken.refresh_expires_at
        }
      });
    } catch (error) {
      console.error('Callback error:', error.response?.data || error.message);
      res.status(500).json({ 
        success: false,
        error: error.response?.data || error.message 
      });
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