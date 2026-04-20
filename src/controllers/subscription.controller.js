import { getPlansForClient, getPlan } from '../config/plans.config.js';
import { createPaymentPage } from '../services/hyp/payment.service.js';
import {
  getOrCreateSubscription,
  upgradePlan,
  downgradeToFree,
  cancelSubscription as cancelSub,
  reactivateSubscription as reactivateSub,
  checkAffiliateLimit,
  checkAiLimit,
} from '../services/subscription/subscription.service.js';

/**
 * GET /subscription/plans
 * רשימת כל התוכניות (ציבורי)
 */
export const getPlans = async (req, res) => {
  try {
    const plans = getPlansForClient();
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('getPlans error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת התוכניות' });
  }
};

/**
 * GET /subscription/my
 * המנוי הנוכחי של המשתמש (auth)
 */
export const getMySubscription = async (req, res) => {
  try {
    const subscription = await getOrCreateSubscription(req.user._id);
    const affiliateInfo = await checkAffiliateLimit(req.user._id);
    const aiInfo = await checkAiLimit(req.user._id);

    res.json({
      success: true,
      data: {
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          daysRemaining: subscription.daysRemaining,
          cardMask: subscription.hyp?.cardMask || null,
        },
        usage: {
          affiliateProducts: affiliateInfo,
          aiRecommendations: aiInfo,
        },
      },
    });
  } catch (error) {
    console.error('getMySubscription error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת פרטי המנוי' });
  }
};

/**
 * POST /subscription/upgrade
 * התחלת שדרוג — יצירת דף תשלום HYP
 */
export const initiateUpgrade = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !['BASIC', 'PRO'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'תוכנית לא תקינה' });
    }

    const currentSub = await getOrCreateSubscription(req.user._id);
    if (currentSub.plan === plan && currentSub.status === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'אתה כבר במנוי הזה' });
    }

    const planConfig = getPlan(plan);

    const result = await createPaymentPage({
      amount: planConfig.price,
      currency: planConfig.currency,
      plan,
      userId: req.user._id.toString(),
    });

    res.json({
      success: true,
      data: {
        paymentUrl: result.paymentUrl,
        plan,
        amount: planConfig.price,
        currency: planConfig.currency,
      },
    });
  } catch (error) {
    console.error('initiateUpgrade error:', error);
    res.status(500).json({ success: false, message: 'שגיאה ביצירת עמוד תשלום' });
  }
};

/**
 * GET /subscription/payment/success
 * Callback מ-HYP לאחר תשלום מוצלח
 */
export const handlePaymentSuccess = async (req, res) => {
  try {
    const { userId, plan, cardToken, cardExp, cardMask, cgUid, responseMac } = req.query;

    if (!userId || !plan || !cardToken) {
      return res.redirect(`${process.env.CLIENT_URL}/dashboard/subscription?status=error&message=missing_params`);
    }

    await upgradePlan(userId, plan, {
      cardToken,
      cardExp: cardExp || '',
      cardMask: cardMask || '',
      transactionId: cgUid || '',
      raw: req.query,
    });

    // Redirect to frontend subscription page with success
    res.redirect(`${process.env.CLIENT_URL}/dashboard/subscription?status=success&plan=${plan}`);
  } catch (error) {
    console.error('handlePaymentSuccess error:', error);
    res.redirect(`${process.env.CLIENT_URL}/dashboard/subscription?status=error&message=upgrade_failed`);
  }
};

/**
 * GET /subscription/payment/error
 * Callback מ-HYP לאחר שגיאה בתשלום
 */
export const handlePaymentError = async (req, res) => {
  const { userId, plan } = req.query;
  console.error('Payment error callback:', req.query);
  res.redirect(`${process.env.CLIENT_URL}/dashboard/subscription?status=error&message=payment_failed`);
};

/**
 * GET /subscription/payment/cancel
 * Callback מ-HYP כשהמשתמש מבטל את התשלום
 */
export const handlePaymentCancel = async (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/dashboard/subscription?status=cancelled`);
};

/**
 * POST /subscription/demo-upgrade
 * שדרוג דמו — ללא תשלום אמיתי (לבדיקות בלבד)
 */
export const demoUpgrade = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !['FREE', 'BASIC', 'PRO'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'תוכנית לא תקינה' });
    }

    if (plan === 'FREE') {
      const subscription = await downgradeToFree(req.user._id);
      return res.json({
        success: true,
        message: 'חזרת לתוכנית חינם (דמו)',
        data: { plan: subscription.plan },
      });
    }

    const subscription = await upgradePlan(req.user._id, plan, {
      cardToken: 'DEMO_TOKEN',
      cardExp: '12/2030',
      cardMask: '****0000',
      transactionId: `DEMO_${Date.now()}`,
      raw: { demo: true },
    });

    res.json({
      success: true,
      message: `שודרגת לתוכנית ${plan === 'PRO' ? 'פרו' : 'בייסיק'} (דמו)`,
      data: { plan: subscription.plan },
    });
  } catch (error) {
    console.error('demoUpgrade error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /subscription/cancel
 * ביטול מנוי (בסוף התקופה)
 */
export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await cancelSub(req.user._id);
    res.json({
      success: true,
      message: 'המנוי יבוטל בסוף התקופה הנוכחית',
      data: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('cancelSubscription error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /subscription/reactivate
 * הפעלה מחדש של מנוי שבוטל
 */
export const reactivateSubscription = async (req, res) => {
  try {
    const subscription = await reactivateSub(req.user._id);
    res.json({
      success: true,
      message: 'המנוי הופעל מחדש',
      data: {
        plan: subscription.plan,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('reactivateSubscription error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};
