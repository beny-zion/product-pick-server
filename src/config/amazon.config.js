// src/config/amazon.config.js
import { env } from './environment.js';

export const amazonConfig = {
  accessKey: env.AMAZON.ACCESS_KEY,
  secretKey: env.AMAZON.SECRET_KEY,
  partnerTag: env.AMAZON.PARTNER_TAG,
  host: 'webservices.amazon.com',
  region: 'us-east-1',
  marketplace: 'www.amazon.com',
  // Resources לבקשות PA-API
  resources: [
    'ItemInfo.Title',
    'ItemInfo.Features',
    'ItemInfo.ByLineInfo',
    'Images.Primary.Large',
    'Images.Variants.Large',
    'Offers.Listings.Price',
    'Offers.Listings.SavingBasis',
    'Offers.Listings.Availability.Message',
    'CustomerReviews.StarRating',
    'CustomerReviews.Count',
    'BrowseNodeInfo.BrowseNodes',
  ],
};

if (env.ENABLE_DEBUG_LOGS) {
  console.log('Amazon Config Loaded:', {
    hasAccessKey: !!amazonConfig.accessKey,
    hasSecretKey: !!amazonConfig.secretKey,
    hasPartnerTag: !!amazonConfig.partnerTag,
    environment: env.NODE_ENV,
  });
}
