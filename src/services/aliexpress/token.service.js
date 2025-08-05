/* needed */
// services/aliexpress/token.service.js
import axios from 'axios';
import crypto from 'crypto';
import { AliexpressToken } from '../../models/AliexpressToken.js';
import schedule from 'node-schedule';
import { config } from "dotenv";
config();


// Helper function for signature generation
const generateSignature = (params) => {
    const signStr = '/auth/token/refresh' + Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}${v}`)
    .join('');
  
  return crypto
    .createHmac('sha256', process.env.ALIEXPRESS_APP_SECRET)
    .update(signStr)
    .digest('hex')
    .toUpperCase();
};

// Token refresh function
const refreshToken = async (oldRefreshToken) => {
  try {
    // console.log('AliExpress Config Loaded:', {
    //     hasAppKey: !!process.env.ALIEXPRESS_APP_KEY,
    //     hasAppSecret: !!process.env.ALIEXPRESS_APP_SECRET
    //   });

    const params = {
      app_key: process.env.ALIEXPRESS_APP_KEY,
      refresh_token: oldRefreshToken,
      sign_method: 'sha256',
      timestamp: Date.now()
    };
    
    params.sign = generateSignature(params);

    const response = await axios.post(
      'https://api-sg.aliexpress.com/rest/auth/token/refresh',
      null,
      { 
        params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Extract token data
    const tokenData = response.data;
    if (!tokenData.access_token || !tokenData.refresh_token || 
        !tokenData.expires_in || !tokenData.refresh_expires_in) {
      throw new Error(`Invalid token data: ${JSON.stringify(tokenData)}`);
    }

    // Calculate expiration dates
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    const refreshExpiresAt = new Date(Date.now() + (tokenData.refresh_expires_in * 1000));

    // Create and save new token
    const newToken = new AliexpressToken({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      refresh_expires_at: refreshExpiresAt
    });

    await newToken.save();

    console.log('Token refreshed successfully at:', new Date().toISOString());
    return newToken;
  } catch (error) {
    console.error('Failed to refresh token:', error.message);
    throw error;
  }
};

// Get valid token
const getValidToken = async () => {
  try {
    console.log('Getting valid token from database');
    const token = await AliexpressToken.findOne().sort({ expires_at: -1 });
    console.log('Found token in database:', token)
    if (!token || token.isExpired()) {
      if (!token) {
        throw new Error('No token found in database');
      }
      return await refreshToken(token.refresh_token);
    }
    
    return token;
  } catch (error) {
    console.error('Error getting valid token:', error.message);
    throw error;
  }
};

// Initialize daily token refresh
const initializeTokenRefresh = () => {
  // Schedule refresh every day at 1 AM
  schedule.scheduleJob('0 1 * * *', async () => {
    try {
        const token = await AliexpressToken.findOne().sort({ expires_at: -1 });
        
        if (!token) {
          console.log('No token found in database');
          return;
        }
  
        console.log('Found token in database:', {
          access_token: token.access_token.substring(0, 10) + '...',  
          refresh_token: token.refresh_token.substring(0, 10) + '...',
          expires_at: token.expires_at,
          refresh_expires_at: token.refresh_expires_at,
          is_expired: token.isExpired()
        });
  

        await refreshToken(token.refresh_token);
        console.log('Token refresh completed successfully');
    } catch (error) {
      console.error('Daily token refresh failed:', error.message);
      // Here you might want to add a notification system for failures
    }
  });

  console.log('Token refresh scheduler initialized - will refresh daily at 1 AM');
};

export const tokenService = {
  getValidToken,
  refreshToken,
  initializeTokenRefresh
};
