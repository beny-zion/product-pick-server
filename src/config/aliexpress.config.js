// src/config/aliexpress.config.js
// import { config } from "dotenv";
// config();

// export const aliexpressConfig = {
//   appKey: process.env.ALIEXPRESS_APP_KEY,
//   appSecret: process.env.ALIEXPRESS_APP_SECRET,
//   baseURL: 'https://api.aliexpress.com/v2',
//   callbackPath: '/api/aliexpress/callback',
  
//   // פונקציה להשגת URL מלא ל-callback
//   getCallbackUrl: () => {
//     const baseUrl = process.env.NODE_ENV === 'production'
//       ? process.env.SERVER_URL
//       : process.env.NGROK_URL;
    
//     console.log('AliExpress Callback URL:', `${baseUrl}/api/aliexpress/callback`);
//     return `${baseUrl}/api/aliexpress/callback`;
//   }
// };
// src/config/aliexpress.config.js
import { config } from "dotenv";
config();

export const aliexpressConfig = {
  appKey: process.env.ALIEXPRESS_APP_KEY,
  appSecret: process.env.ALIEXPRESS_APP_SECRET,
  baseURL: 'https://api.aliexpress.com/v2',
  
  // Example affiliate URL for testing
  testAffiliateUrl: 'https://s.click.aliexpress.com/e/_omibs01',
  
  // Example product URL for testing
  testProductUrl: 'https://he.aliexpress.com/item/1005006385431766.html'
};

console.log('AliExpress Config Loaded:', {
  hasAppKey: !!process.env.ALIEXPRESS_APP_KEY,
  hasAppSecret: !!process.env.ALIEXPRESS_APP_SECRET
});