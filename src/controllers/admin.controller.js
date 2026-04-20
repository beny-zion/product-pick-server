import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import PaymentLog from '../models/PaymentLog.js';
import FullProduct from '../models/FullProduct.js';
import { getPlan } from '../config/plans.config.js';

/**
 * GET /admin/stats
 * סטטיסטיקות כלליות של הפלטפורמה
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      activeProducts,
      subscriptionStats,
      revenueStats,
      recentPayments,
    ] = await Promise.all([
      User.countDocuments(),
      FullProduct.countDocuments(),
      FullProduct.countDocuments({ status: 'ACTIVE' }),
      Subscription.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]),
      PaymentLog.aggregate([
        { $match: { status: 'SUCCESS' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      PaymentLog.aggregate([
        { $match: { status: 'SUCCESS', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: null, monthlyRevenue: { $sum: '$amount' } } },
      ]),
    ]);

    // Format subscription stats
    const planCounts = { FREE: 0, BASIC: 0, PRO: 0 };
    subscriptionStats.forEach((s) => {
      planCounts[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byPlan: planCounts,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        revenue: {
          total: revenueStats[0]?.totalRevenue || 0,
          monthly: recentPayments[0]?.monthlyRevenue || 0,
          totalPayments: revenueStats[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת סטטיסטיקות' });
  }
};

/**
 * GET /admin/users
 * רשימת משתמשים עם חיפוש, פילטרים, ודפדוף
 */
export const getUsers = async (req, res) => {
  try {
    const { search, plan, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build user query
    const userQuery = {};
    if (search) {
      userQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(userQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await User.countDocuments(userQuery);

    // Get subscriptions for these users
    const userIds = users.map((u) => u._id);
    const subscriptions = await Subscription.find({ userId: { $in: userIds } }).lean();
    const subMap = {};
    subscriptions.forEach((s) => { subMap[s.userId.toString()] = s; });

    // Get product counts
    const productCounts = await FullProduct.aggregate([
      { $match: { vendorId: { $in: userIds } } },
      { $group: { _id: '$vendorId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    productCounts.forEach((p) => { countMap[p._id.toString()] = p.count; });

    // Combine data
    let enrichedUsers = users.map((u) => ({
      ...u,
      subscription: subMap[u._id.toString()] || { plan: 'FREE', status: 'ACTIVE' },
      productCount: countMap[u._id.toString()] || 0,
    }));

    // Filter by plan if requested
    if (plan) {
      enrichedUsers = enrichedUsers.filter((u) => u.subscription.plan === plan);
    }

    res.json({
      success: true,
      data: enrichedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת משתמשים' });
  }
};

/**
 * GET /admin/users/:id
 * פרטי משתמש מלאים
 */
export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'משתמש לא נמצא' });
    }

    const [subscription, products, payments] = await Promise.all([
      Subscription.findOne({ userId: user._id }).lean(),
      FullProduct.find({ vendorId: user._id }).select('title status source createdAt').sort({ createdAt: -1 }).lean(),
      PaymentLog.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      success: true,
      data: {
        user,
        subscription: subscription || { plan: 'FREE', status: 'ACTIVE' },
        products,
        payments,
      },
    });
  } catch (error) {
    console.error('getUserDetails error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת פרטי משתמש' });
  }
};

/**
 * PUT /admin/users/:id/plan
 * שינוי תוכנית ידני ע"י אדמין
 */
export const updateUserPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['FREE', 'BASIC', 'PRO'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'תוכנית לא תקינה' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'משתמש לא נמצא' });
    }

    let subscription = await Subscription.findOne({ userId: user._id });

    if (!subscription) {
      subscription = new Subscription({ userId: user._id });
    }

    subscription.plan = plan;
    subscription.status = 'ACTIVE';

    if (plan !== 'FREE') {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;
    } else {
      subscription.currentPeriodStart = null;
      subscription.currentPeriodEnd = null;
      subscription.hyp = {};
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.failedPaymentAttempts = 0;
    await subscription.save();

    res.json({
      success: true,
      message: `התוכנית שונתה ל-${plan}`,
      data: subscription,
    });
  } catch (error) {
    console.error('updateUserPlan error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בעדכון התוכנית' });
  }
};

/**
 * GET /admin/products
 * כל המוצרים עם פילטרים
 */
export const getProducts = async (req, res) => {
  try {
    const { search, status, source, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [{ title: { $regex: search, $options: 'i' } }];
    }
    if (status) query.status = status;
    if (source) query.source = source;

    const [products, total] = await Promise.all([
      FullProduct.find(query)
        .populate('vendorId', 'fullName email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FullProduct.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת מוצרים' });
  }
};

/**
 * PUT /admin/products/:id/status
 * הפעלה/כיבוי מוצר
 */
export const toggleProductStatus = async (req, res) => {
  try {
    const product = await FullProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'מוצר לא נמצא' });
    }

    product.status = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await product.save();

    res.json({
      success: true,
      message: `המוצר ${product.status === 'ACTIVE' ? 'הופעל' : 'הושבת'}`,
      data: { status: product.status },
    });
  } catch (error) {
    console.error('toggleProductStatus error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בעדכון מוצר' });
  }
};

/**
 * GET /admin/payments
 * לוג תשלומים
 */
export const getPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const [payments, total] = await Promise.all([
      PaymentLog.find(query)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      PaymentLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getPayments error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת תשלומים' });
  }
};

/**
 * GET /admin/subscriptions/stats
 * סטטיסטיקות מנויים מפורטות
 */
export const getSubscriptionStats = async (req, res) => {
  try {
    const stats = await Subscription.aggregate([
      {
        $facet: {
          byPlan: [{ $group: { _id: '$plan', count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          cancelledThisMonth: [
            {
              $match: {
                cancelledAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('getSubscriptionStats error:', error);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת סטטיסטיקות' });
  }
};
