import {
  checkAffiliateLimit,
  checkAiLimit,
  checkAmazonAccess,
  checkStoreLimit as checkStoreLimitService,
  getOrCreateSubscription,
} from '../services/subscription/subscription.service.js';

/**
 * Enforce affiliate product limit before product creation
 * Use AFTER auth middleware
 */
export const enforceAffiliateLimit = async (req, res, next) => {
  try {
    const { productData } = req.body;

    // Only check for products with custom affiliate links
    if (!productData?.isCustomAffiliateLink) {
      return next();
    }

    const result = await checkAffiliateLimit(req.user._id);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        message: 'הגעת למגבלת הלינקים האישיים בתוכנית שלך',
        code: 'AFFILIATE_LIMIT_REACHED',
        data: {
          current: result.current,
          limit: result.limit,
          plan: result.plan,
        },
      });
    }

    // Attach subscription info for downstream use
    req.subscriptionInfo = { affiliateLimit: result };
    next();
  } catch (error) {
    console.error('enforceAffiliateLimit error:', error);
    next(); // Don't block on error
  }
};

/**
 * Enforce AI recommendations limit
 */
export const enforceAiLimit = async (req, res, next) => {
  try {
    const result = await checkAiLimit(req.user._id);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        message: 'הגעת למגבלת המלצות ה-AI החודשית בתוכנית שלך',
        code: 'AI_LIMIT_REACHED',
        data: {
          used: result.used,
          limit: result.limit,
          plan: result.plan,
        },
      });
    }

    req.subscriptionInfo = { ...req.subscriptionInfo, aiLimit: result };
    next();
  } catch (error) {
    console.error('enforceAiLimit error:', error);
    next();
  }
};

/**
 * Enforce Amazon access (PRO only)
 */
export const enforceAmazonAccess = async (req, res, next) => {
  try {
    const hasAccess = await checkAmazonAccess(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'גישה למוצרי אמזון זמינה רק בתוכנית פרו',
        code: 'AMAZON_PRO_ONLY',
      });
    }

    next();
  } catch (error) {
    console.error('enforceAmazonAccess error:', error);
    next();
  }
};

/**
 * Enforce store limit before store creation
 * Use AFTER auth middleware
 */
export const enforceStoreLimit = async (req, res, next) => {
  try {
    const result = await checkStoreLimitService(req.user._id);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        message: 'הגעת למגבלת החנויות בתוכנית שלך',
        code: 'STORE_LIMIT_REACHED',
        data: {
          current: result.current,
          limit: result.limit,
          plan: result.plan,
        },
      });
    }

    req.subscriptionInfo = { ...req.subscriptionInfo, storeLimit: result };
    next();
  } catch (error) {
    console.error('enforceStoreLimit error:', error);
    next();
  }
};

/**
 * Generic plan requirement middleware
 * Usage: requirePlan(['BASIC', 'PRO'])
 */
export const requirePlan = (allowedPlans) => {
  return async (req, res, next) => {
    try {
      const subscription = await getOrCreateSubscription(req.user._id);

      if (!allowedPlans.includes(subscription.plan)) {
        return res.status(403).json({
          success: false,
          message: 'פיצ\'ר זה זמין רק בתוכניות בתשלום',
          code: 'PLAN_REQUIRED',
          data: {
            currentPlan: subscription.plan,
            requiredPlans: allowedPlans,
          },
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('requirePlan error:', error);
      next();
    }
  };
};
