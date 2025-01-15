// models/ProductStats.js
import mongoose from 'mongoose';

const hourlyStatsSchema = new mongoose.Schema({
  hour: Number,
  date: Date,
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  viewDuration: { type: Number, default: 0 }
});

const dailyStatsSchema = new mongoose.Schema({
  date: Date,
  totalViews: { type: Number, default: 0 },
  totalClicks: { type: Number, default: 0 },
  totalViewTime: { type: Number, default: 0 },
  averageViewTime: { type: Number, default: 0 }
});

const productStatsSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // סטטיסטיקות לפי שעות
  hourlyStats: {
    type: [hourlyStatsSchema],
    default: []
  },
  // סטטיסטיקות יומיות
  dailyStats: {
    type: dailyStatsSchema,
    default: {
      date: new Date(),
      totalViews: 0,
      totalClicks: 0,
      totalViewTime: 0,
      averageViewTime: 0
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// אינדקסים לביצועים
productStatsSchema.index({ productId: 1 });
productStatsSchema.index({ vendorId: 1 });
productStatsSchema.index({ 'hourlyStats.date': 1 });
productStatsSchema.index({ 'dailyStats.date': 1 });

// וירטואל לחישוב אחוז המרה
productStatsSchema.virtual('conversionRate').get(function() {
  const { totalViews, totalClicks } = this.dailyStats;
  if (!totalViews) return 0;
  return (totalClicks / totalViews) * 100;
});

export default mongoose.model('ProductStats', productStatsSchema);