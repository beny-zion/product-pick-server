// src/services/amazon/product.service.js
import amazonPaapi from 'amazon-paapi';
import { amazonConfig } from '../../config/amazon.config.js';

const commonParams = {
  AccessKey: amazonConfig.accessKey,
  SecretKey: amazonConfig.secretKey,
  PartnerTag: amazonConfig.partnerTag,
  PartnerType: 'Associates',
  Marketplace: amazonConfig.marketplace,
};

/**
 * שליפת מוצר לפי ASIN מ-Amazon PA-API
 */
export const getItemByASIN = async (asin) => {
  try {
    console.log('Amazon PA-API: Getting item details for ASIN:', asin);

    const requestParams = {
      ItemIds: [asin],
      ItemIdType: 'ASIN',
      Condition: 'New',
      Resources: amazonConfig.resources,
    };

    const response = await amazonPaapi.GetItems(commonParams, requestParams);
    console.log('Amazon PA-API Response received');
    return response;
  } catch (error) {
    console.error('Amazon PA-API Error:', JSON.stringify(error, null, 2));
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    console.error('Error data:', error.data);
    console.error('Error response:', error.response?.data || error.response);
    if (error.status === 429) {
      throw new Error('חריגה ממגבלת קריאות API של אמזון. נסה שוב בעוד רגע.');
    }
    throw error;
  }
};

/**
 * נרמול תגובת Amazon PA-API לפורמט אחיד (כמו AliExpress)
 */
export const parseAmazonResponse = (response) => {
  const items = response?.ItemsResult?.Items;

  if (!items || items.length === 0) {
    throw new Error('המוצר לא נמצא באמזון או שאינו זמין');
  }

  return items.map((item) => {
    const listing = item.Offers?.Listings?.[0];
    const currentPrice = listing?.Price?.Amount;
    const originalPrice = listing?.SavingBasis?.Amount;
    const currency = listing?.Price?.Currency || 'USD';
    const discount =
      originalPrice && currentPrice && originalPrice > currentPrice
        ? `${Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}%`
        : null;

    const browseNode = item.BrowseNodeInfo?.BrowseNodes?.[0];

    return {
      productId: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue || '',
      price: {
        current: currentPrice ? String(currentPrice) : '0',
        original: originalPrice ? String(originalPrice) : String(currentPrice || '0'),
        discount,
        currency,
      },
      images: {
        main: item.Images?.Primary?.Large?.URL || '',
        small:
          item.Images?.Variants?.map((v) => v.Large?.URL).filter(Boolean) || [],
      },
      links: {
        detail: item.DetailPageURL,
        promotion: item.DetailPageURL, // Amazon affiliate link = detail URL (כבר כולל PartnerTag)
      },
      stats: {
        commission: null,
        sales: null,
        rating: item.CustomerReviews?.StarRating?.Value
          ? String(item.CustomerReviews.StarRating.Value)
          : null,
        reviewCount: item.CustomerReviews?.Count?.Value || null,
      },
      categories: {
        main: {
          id: browseNode?.Id ? String(browseNode.Id) : '',
          name: browseNode?.DisplayName || '',
        },
        sub: {
          id: browseNode?.Ancestor?.Id
            ? String(browseNode.Ancestor.Id)
            : '',
          name: browseNode?.Ancestor?.DisplayName || '',
        },
      },
      features: item.ItemInfo?.Features?.DisplayValues || [],
    };
  });
};

export const amazonProductService = {
  getItemByASIN,
  parseAmazonResponse,
};
