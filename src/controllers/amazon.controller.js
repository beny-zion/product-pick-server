// src/controllers/amazon.controller.js
import { amazonProductService } from '../services/amazon/product.service.js';
import axios from 'axios';

/**
 * חילוץ ASIN מפורמטים שונים של URL באמזון:
 * - https://www.amazon.com/dp/B08N5WRWNW
 * - https://www.amazon.com/gp/product/B08N5WRWNW
 * - https://www.amazon.com/Some-Product-Name/dp/B08N5WRWNW/...
 * - https://amzn.to/3xyzABC (לינק קצר, צריך redirect)
 * - ASIN ישיר: B08N5WRWNW
 */
const extractASIN = async (input) => {
  try {
    // בדיקה אם זה ASIN ישיר (10 תווים אלפאנומריים)
    if (/^[A-Z0-9]{10}$/i.test(input)) {
      return input.toUpperCase();
    }

    let url = input;

    // טיפול בלינקים קצרים של amzn.to - מעקב אחרי redirect
    if (url.includes('amzn.to') || url.includes('amzn.com')) {
      try {
        const response = await axios.get(url, {
          maxRedirects: 5,
          timeout: 5000,
        });
        url = response.request?.res?.responseUrl || response.config?.url || url;
      } catch (err) {
        if (err.response?.headers?.location) {
          url = err.response.headers.location;
        }
      }
    }

    // חילוץ ASIN מתבניות URL שונות
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/product\/([A-Z0-9]{10})/i,
      /\/ASIN\/([A-Z0-9]{10})/i,
      /[?&]asin=([A-Z0-9]{10})/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1].toUpperCase();
    }

    return null;
  } catch (err) {
    console.error('Error extracting ASIN:', err.message);
    return null;
  }
};

/**
 * אימות מוצר אמזון — חילוץ ASIN ושליפת נתונים
 */
export const validateProduct = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'נא להזין לינק למוצר',
      });
    }

    console.log('Amazon validate - URL:', url);

    const asin = await extractASIN(url);
    console.log('Extracted ASIN:', asin);

    if (!asin) {
      return res.status(400).json({
        success: false,
        message: 'לינק אמזון לא תקין. נא להזין לינק למוצר באמזון',
      });
    }

    const response = await amazonProductService.getItemByASIN(asin);
    const parsedProducts = amazonProductService.parseAmazonResponse(response);
    const product = parsedProducts[0];

    console.log('Parsed Amazon product:', product.title);

    res.json({
      success: true,
      data: {
        ...product,
        source: 'AMAZON',
        isAffiliate: true, // לינקים של אמזון תמיד כוללים partner tag
      },
    });
  } catch (error) {
    console.error('Amazon product validation error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'שגיאה באימות מוצר אמזון',
    });
  }
};
