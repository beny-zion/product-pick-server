/**
 * תוכניות מנויים — BuyWise
 * מקום אחד לכל ההגדרות של התוכניות
 */

export const PLANS = {
  FREE: {
    name: 'FREE',
    displayName: 'חינם',
    price: 0,
    currency: 'ILS',
    limits: {
      affiliateProducts: 20,
      aiRecommendations: 3,
      analyticsDays: 7,
      maxStores: 1,
      canUseAmazon: false,
      canPromote: false,
      canUseSeoAi: false,
      promotedProducts: 0,
    },
  },
  BASIC: {
    name: 'BASIC',
    displayName: 'בייסיק',
    price: 17, // ~$5
    currency: 'ILS',
    limits: {
      affiliateProducts: 99,
      aiRecommendations: 20,
      analyticsDays: 30,
      maxStores: 1,
      canUseAmazon: false,
      canPromote: false,
      canUseSeoAi: false,
      promotedProducts: 0,
    },
  },
  PRO: {
    name: 'PRO',
    displayName: 'פרו',
    price: 55, // ~$15
    currency: 'ILS',
    limits: {
      affiliateProducts: Infinity,
      aiRecommendations: Infinity,
      analyticsDays: 90,
      maxStores: 3,
      canUseAmazon: true,
      canPromote: true,
      canUseSeoAi: true,
      promotedProducts: 3,
    },
  },
};

/**
 * Get plan config by name
 */
export const getPlan = (planName) => {
  return PLANS[planName] || PLANS.FREE;
};

/**
 * Get limits for a plan
 */
export const getPlanLimits = (planName) => {
  const plan = getPlan(planName);
  return plan.limits;
};

/**
 * Get all plans for pricing page (serializable — replaces Infinity with -1)
 */
export const getPlansForClient = () => {
  return Object.values(PLANS).map((plan) => ({
    ...plan,
    limits: {
      ...plan.limits,
      affiliateProducts: plan.limits.affiliateProducts === Infinity ? -1 : plan.limits.affiliateProducts,
      aiRecommendations: plan.limits.aiRecommendations === Infinity ? -1 : plan.limits.aiRecommendations,
    },
  }));
};
