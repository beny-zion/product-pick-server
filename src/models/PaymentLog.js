import mongoose from 'mongoose';

const paymentLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true,
  },
  type: {
    type: String,
    enum: ['INITIAL', 'RECURRING', 'REFUND'],
    required: true,
  },
  plan: {
    type: String,
    enum: ['BASIC', 'PRO'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'ILS',
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'PENDING',
    index: true,
  },
  hypTransactionId: String,
  hypResponse: mongoose.Schema.Types.Mixed,
  failureReason: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const PaymentLog = mongoose.model('PaymentLog', paymentLogSchema);
export default PaymentLog;
