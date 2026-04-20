import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['FREE', 'BASIC', 'PRO'],
      default: 'FREE',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },

    // HYP payment data
    hyp: {
      cardToken: String,
      cardExp: String,
      cardMask: String,
      lastTransactionId: String,
    },

    // Billing period
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelledAt: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    // Retry tracking for failed payments
    failedPaymentAttempts: {
      type: Number,
      default: 0,
    },

    // Usage tracking (resets monthly)
    usage: {
      aiRecommendationsUsed: {
        type: Number,
        default: 0,
      },
      usageResetDate: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: is the subscription paid (not FREE)
subscriptionSchema.virtual('isPaid').get(function () {
  return this.plan !== 'FREE' && this.status === 'ACTIVE';
});

// Virtual: days remaining in current period
subscriptionSchema.virtual('daysRemaining').get(function () {
  if (!this.currentPeriodEnd) return null;
  const now = new Date();
  const diff = this.currentPeriodEnd - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
