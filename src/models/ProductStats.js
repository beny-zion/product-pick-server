/* needed */
// models/ProductStats.js - גרסה מפושטת
import mongoose from 'mongoose';

const productStatsSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FullProduct',
    required: true,
    unique: true // מוצר אחד = רשומה אחת
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // פתיחות מודל
  modalOpens: {
    type: Number,
    default: 0
  },
  // קליקים על קישור אפיליאט
  clicks: {
    type: Number,
    default: 0
  },
  // תאריך יצירה
  date: {
    type: Date,
    default: Date.now
  },
  // תאריך עדכון אחרון
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// אינדקסים לביצועים
productStatsSchema.index({ productId: 1 });
productStatsSchema.index({ vendorId: 1 });
productStatsSchema.index({ date: 1 });

// וירטואל לחישוב אחוז המרה
productStatsSchema.virtual('conversionRate').get(function() {
  if (!this.modalOpens) return 0;
  return (this.clicks / this.modalOpens) * 100;
});

// הוספת JSON transform
productStatsSchema.set('toJSON', { virtuals: true });

const ProductStats = mongoose.model('ProductStats', productStatsSchema);
export default ProductStats;