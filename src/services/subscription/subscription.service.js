import Subscription from '../../models/Subscription.js';
import PaymentLog from '../../models/PaymentLog.js';
import FullProduct from '../../models/FullProduct.js';
import { getPlan, getPlanLimits } from '../../config/plans.config.js';
import { chargeRecurring } from '../hyp/payment.service.js';

/**
 * Get or create subscription for a user
 * Every user gets a FREE subscription by default
 */
export async function getOrCreateSubscription(userId) {
  let subscription = await Subscription.findOne({ userId });

  if (!subscription) {
    const freeLimits = getPlanLimits('FREE');
    subscription = await Subscription.create({
      userId,
      plan: 'FREE',
      status: 'ACTIVE',
      usage: {
        aiRecommendationsUsed: 0,
        usageResetDate: new Date(),
      },
    });
  }

  return subscription;
}

/**
 * Upgrade plan after successful payment
 */
export async function upgradePlan(userId, plan, paymentData) {
  const planConfig = getPlan(plan);
  if (!planConfig || plan === 'FREE') {
    throw new Error('Invalid plan for upgrade');
  }

  // שמירת התוכנית הקודמת לפני העדכון — לזיהוי downgrade (PRO → BASIC)
  const existing = await Subscription.findOne({ userId });
  const previousPlan = existing?.plan || 'FREE';

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await Subscription.findOneAndUpdate(
    { userId },
    {
      plan,
      status: 'ACTIVE',
      hyp: {
        cardToken: paymentData.cardToken,
        cardExp: paymentData.cardExp,
        cardMask: paymentData.cardMask || '',
        lastTransactionId: paymentData.transactionId,
      },
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      failedPaymentAttempts: 0,
    },
    { new: true, upsert: true }
  );

  // Log payment
  await PaymentLog.create({
    userId,
    subscriptionId: subscription._id,
    type: 'INITIAL',
    plan,
    amount: planConfig.price,
    currency: planConfig.currency,
    status: 'SUCCESS',
    hypTransactionId: paymentData.transactionId,
    hypResponse: paymentData.raw || {},
  });

  // אם זה למעשה downgrade (מגבלת חנויות קטנה מהקודמת) — נועלים חנויות עודפות
  const previousMax = getPlanLimits(previousPlan).maxStores;
  const newMax = getPlanLimits(plan).maxStores;
  if (newMax < previousMax) {
    await enforceStoreDowngrade(userId, plan);
  } else {
    // שדרוג אמיתי — פותחים חנויות נעולות מהורדה קודמת
    await unlockAllStores(userId);
  }

  return subscription;
}

/**
 * סנכרון מצב חנויות לפי התוכנית הנוכחית — self-healing.
 *  1. מתקן dual-default (משאיר רק את הישנה ביותר)
 *  2. אם אין ברירת מחדל — מקדם את הישנה ביותר
 *  3. מפעיל enforceStoreDowngrade אם יש יותר חנויות פעילות מהמותר
 * נקרא בכל getMyStores כדי להבטיח עקביות.
 */
export async function syncVendorStores(userId) {
  const Store = (await import('../../models/Store.js')).default;
  const FullProduct = (await import('../../models/FullProduct.js')).default;
  const subscription = await getOrCreateSubscription(userId);

  // 1. תיקון dual-default
  const defaults = await Store.find({ vendorId: userId, isDefault: true }).sort({ createdAt: 1 });
  if (defaults.length > 1) {
    const keep = defaults[0];
    const demoteIds = defaults.slice(1).map((s) => s._id);
    await Store.updateMany({ _id: { $in: demoteIds } }, { $set: { isDefault: false } });
    console.log(`[syncVendorStores] Demoted ${demoteIds.length} duplicate default stores for user ${userId}`);
  }

  // 2. וידוא שיש לפחות ברירת מחדל אחת
  if (defaults.length === 0) {
    const oldest = await Store.findOne({ vendorId: userId }).sort({ createdAt: 1 });
    if (oldest) {
      oldest.isDefault = true;
      await oldest.save();
      console.log(`[syncVendorStores] Promoted ${oldest.name} to default for user ${userId}`);
    }
  }

  // 3. אכיפת מגבלת תוכנית נוכחית
  const limits = getPlanLimits(subscription.plan);
  const activeCount = await Store.countDocuments({
    vendorId: userId,
    isLocked: { $ne: true },
  });
  if (activeCount > limits.maxStores) {
    await enforceStoreDowngrade(userId, subscription.plan);
    console.log(`[syncVendorStores] Enforced downgrade: ${activeCount} → ${limits.maxStores} for user ${userId}`);
  }

  // 4. סנכרון productCount של כל חנות למוצרים בפועל
  const stores = await Store.find({ vendorId: userId });
  for (const store of stores) {
    const actualCount = await FullProduct.countDocuments({
      storeId: store._id,
      status: 'ACTIVE',
    });
    if (store.productCount !== actualCount) {
      await Store.findByIdAndUpdate(store._id, { productCount: actualCount });
    }
  }
}

/**
 * פתיחת כל החנויות שננעלו בעקבות הורדת תוכנית קודמת
 */
export async function unlockAllStores(userId) {
  const Store = (await import('../../models/Store.js')).default;
  await Store.updateMany(
    { vendorId: userId, isLocked: true },
    { $set: { isLocked: false, lockedAt: null, lockedReason: null } }
  );
}

/**
 * אכיפת מגבלת חנויות בהורדת תוכנית:
 *   1. מעביר את כל המוצרים מהחנויות העודפות לחנות ברירת המחדל
 *   2. נועל את החנויות העודפות
 * השמירה היא על "seniority" — נועלים את החנויות שנוצרו אחרונות.
 */
export async function enforceStoreDowngrade(userId, targetPlan) {
  const Store = (await import('../../models/Store.js')).default;
  const FullProduct = (await import('../../models/FullProduct.js')).default;

  const maxStores = getPlanLimits(targetPlan).maxStores;

  const defaultStore = await Store.findOne({ vendorId: userId, isDefault: true });
  if (!defaultStore) return; // I1 — לא אמור לקרות

  // חנויות לא-ברירת-מחדל ולא-נעולות, ממוינות לפי זמן יצירה (ישנות → חדשות)
  // שימוש ב-$ne:true כדי לתפוס גם מסמכים שבהם isLocked לא קיים (legacy data)
  const extraStores = await Store.find({
    vendorId: userId,
    isDefault: { $ne: true },
    isLocked: { $ne: true },
  }).sort({ createdAt: 1 });

  // שומרים (maxStores - 1) מתוך החנויות הנוספות, את היתר נועלים
  const keepCount = Math.max(0, maxStores - 1);
  const toLock = extraStores.slice(keepCount);

  for (const store of toLock) {
    // העברת כל המוצרים לחנות ברירת המחדל
    const moveResult = await FullProduct.updateMany(
      { storeId: store._id },
      { $set: { storeId: defaultStore._id } }
    );

    if (moveResult.modifiedCount > 0) {
      await Store.findByIdAndUpdate(defaultStore._id, {
        $inc: { productCount: moveResult.modifiedCount },
      });
    }

    // נעילת החנות
    await Store.findByIdAndUpdate(store._id, {
      isLocked: true,
      lockedAt: new Date(),
      lockedReason: 'PLAN_DOWNGRADE',
      productCount: 0,
    });
  }
}

/**
 * Cancel subscription (at end of period)
 */
export async function cancelSubscription(userId) {
  const subscription = await Subscription.findOne({ userId });
  if (!subscription || subscription.plan === 'FREE') {
    throw new Error('No active paid subscription to cancel');
  }

  subscription.cancelAtPeriodEnd = true;
  subscription.cancelledAt = new Date();
  await subscription.save();

  return subscription;
}

/**
 * Reactivate a cancelled subscription (before period ends)
 */
export async function reactivateSubscription(userId) {
  const subscription = await Subscription.findOne({ userId });
  if (!subscription || !subscription.cancelAtPeriodEnd) {
    throw new Error('No cancelled subscription to reactivate');
  }

  if (subscription.currentPeriodEnd < new Date()) {
    throw new Error('Subscription period has already ended');
  }

  subscription.cancelAtPeriodEnd = false;
  subscription.cancelledAt = null;
  await subscription.save();

  return subscription;
}

/**
 * Downgrade to FREE plan
 */
export async function downgradeToFree(userId) {
  const subscription = await Subscription.findOneAndUpdate(
    { userId },
    {
      plan: 'FREE',
      status: 'ACTIVE',
      hyp: {},
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      failedPaymentAttempts: 0,
    },
    { new: true }
  );

  // אכיפת מגבלת חנויות (נעילה + איחוד מוצרים)
  await enforceStoreDowngrade(userId, 'FREE');

  return subscription;
}

/**
 * Check affiliate product limit for a user
 * Returns { allowed, current, limit, remaining }
 */
export async function checkAffiliateLimit(userId) {
  const subscription = await getOrCreateSubscription(userId);
  const limits = getPlanLimits(subscription.plan);

  const affiliateCount = await FullProduct.countDocuments({
    vendorId: userId,
    isCustomAffiliateLink: true,
    status: 'ACTIVE',
  });

  const limit = limits.affiliateProducts;
  const isUnlimited = limit === Infinity;

  return {
    allowed: isUnlimited || affiliateCount < limit,
    current: affiliateCount,
    limit: isUnlimited ? -1 : limit,
    remaining: isUnlimited ? -1 : Math.max(0, limit - affiliateCount),
    plan: subscription.plan,
  };
}

/**
 * Check AI recommendations usage
 */
export async function checkAiLimit(userId) {
  const subscription = await getOrCreateSubscription(userId);
  const limits = getPlanLimits(subscription.plan);

  const limit = limits.aiRecommendations;
  const used = subscription.usage?.aiRecommendationsUsed || 0;
  const isUnlimited = limit === Infinity;

  return {
    allowed: isUnlimited || used < limit,
    used,
    limit: isUnlimited ? -1 : limit,
    remaining: isUnlimited ? -1 : Math.max(0, limit - used),
    plan: subscription.plan,
  };
}

/**
 * Increment AI usage counter
 */
export async function incrementAiUsage(userId) {
  await Subscription.findOneAndUpdate(
    { userId },
    { $inc: { 'usage.aiRecommendationsUsed': 1 } }
  );
}

/**
 * Check store limit for a vendor
 * Returns { allowed, current, limit, remaining }
 */
export async function checkStoreLimit(userId) {
  const subscription = await getOrCreateSubscription(userId);
  const limits = getPlanLimits(subscription.plan);

  const Store = (await import('../../models/Store.js')).default;
  // חנויות נעולות לא נספרות לטובת המגבלה
  const storeCount = await Store.countDocuments({
    vendorId: userId,
    isLocked: { $ne: true },
  });

  const limit = limits.maxStores;

  return {
    allowed: storeCount < limit,
    current: storeCount,
    limit,
    remaining: Math.max(0, limit - storeCount),
    plan: subscription.plan,
  };
}

/**
 * Check if user can use Amazon products
 */
export async function checkAmazonAccess(userId) {
  const subscription = await getOrCreateSubscription(userId);
  const limits = getPlanLimits(subscription.plan);
  return limits.canUseAmazon;
}

/**
 * Process recurring payments for all active subscriptions due for renewal
 */
export async function processRecurringPayments() {
  const now = new Date();

  // Find subscriptions that need renewal
  const dueSubscriptions = await Subscription.find({
    plan: { $ne: 'FREE' },
    status: 'ACTIVE',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: { $lte: now },
    'hyp.cardToken': { $exists: true, $ne: '' },
  });

  console.log(`[Cron] Processing ${dueSubscriptions.length} recurring payments`);

  const results = { success: 0, failed: 0, cancelled: 0 };

  for (const sub of dueSubscriptions) {
    const planConfig = getPlan(sub.plan);

    try {
      const result = await chargeRecurring({
        cardToken: sub.hyp.cardToken,
        cardExp: sub.hyp.cardExp,
        amount: planConfig.price,
        currency: planConfig.currency,
        description: `BuyWise - ${planConfig.displayName} - חידוש`,
      });

      if (result.success) {
        // Extend period by 1 month
        const newStart = new Date();
        const newEnd = new Date();
        newEnd.setMonth(newEnd.getMonth() + 1);

        sub.currentPeriodStart = newStart;
        sub.currentPeriodEnd = newEnd;
        sub.failedPaymentAttempts = 0;
        sub.hyp.lastTransactionId = result.transactionId;
        await sub.save();

        await PaymentLog.create({
          userId: sub.userId,
          subscriptionId: sub._id,
          type: 'RECURRING',
          plan: sub.plan,
          amount: planConfig.price,
          currency: planConfig.currency,
          status: 'SUCCESS',
          hypTransactionId: result.transactionId,
          hypResponse: result.raw || {},
        });

        results.success++;
      } else {
        sub.failedPaymentAttempts += 1;

        if (sub.failedPaymentAttempts >= 3) {
          sub.status = 'PAST_DUE';
        }
        await sub.save();

        await PaymentLog.create({
          userId: sub.userId,
          subscriptionId: sub._id,
          type: 'RECURRING',
          plan: sub.plan,
          amount: planConfig.price,
          currency: planConfig.currency,
          status: 'FAILED',
          failureReason: result.statusText || result.error,
          hypResponse: result.raw || {},
        });

        results.failed++;
      }
    } catch (error) {
      console.error(`[Cron] Payment error for user ${sub.userId}:`, error.message);
      results.failed++;
    }
  }

  // Handle cancelled subscriptions that reached end of period
  const cancelledDue = await Subscription.find({
    cancelAtPeriodEnd: true,
    currentPeriodEnd: { $lte: now },
    status: 'ACTIVE',
  });

  for (const sub of cancelledDue) {
    await downgradeToFree(sub.userId);
    results.cancelled++;
  }

  // Handle PAST_DUE subscriptions (7+ days) → expire → downgrade
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const expiredSubs = await Subscription.find({
    status: 'PAST_DUE',
    currentPeriodEnd: { $lte: sevenDaysAgo },
  });

  for (const sub of expiredSubs) {
    await downgradeToFree(sub.userId);
  }

  console.log(`[Cron] Recurring payments done:`, results);
  return results;
}

/**
 * Reset monthly usage counters
 */
export async function resetMonthlyUsage() {
  const result = await Subscription.updateMany(
    { 'usage.usageResetDate': { $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    {
      $set: {
        'usage.aiRecommendationsUsed': 0,
        'usage.usageResetDate': new Date(),
      },
    }
  );

  console.log(`[Cron] Reset usage for ${result.modifiedCount} subscriptions`);
  return result.modifiedCount;
}
