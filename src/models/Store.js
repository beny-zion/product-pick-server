import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  logo: {
    type: String,
    default: '',
  },
  coverImage: {
    type: String,
    default: '',
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true,
  },
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE'],
    default: 'PUBLIC',
  },
  productCount: {
    type: Number,
    default: 0,
  },
  // נעילה בעקבות הורדת תוכנית — לא מוצגת לציבור, לא ניתנת לעדכון
  isLocked: {
    type: Boolean,
    default: false,
    index: true,
  },
  lockedAt: {
    type: Date,
    default: null,
  },
  lockedReason: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// חיפוש מהיר של חנות ברירת מחדל למוכר
storeSchema.index({ vendorId: 1, isDefault: 1 });
storeSchema.index({ vendorId: 1, isLocked: 1 });

/**
 * יצירת slug ייחודי מתוך שם
 */
async function generateUniqueSlug(Model, baseName) {
  const base = baseName
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'store';

  let slug = base;
  let counter = 0;

  while (await Model.findOne({ slug })) {
    counter++;
    slug = `${base}-${counter}`;
  }

  return slug;
}

/**
 * קבלה או יצירת חנות ברירת מחדל למוכר
 * נקרא אוטומטית כשמוכר מוסיף מוצר בלי storeId
 */
storeSchema.statics.getOrCreateDefault = async function(vendorId, vendorName) {
  let store = await this.findOne({ vendorId, isDefault: true });

  if (!store) {
    const slug = await generateUniqueSlug(this, vendorName || 'store');
    store = await this.create({
      vendorId,
      name: vendorName || 'החנות שלי',
      slug,
      isDefault: true,
    });
  }

  return store;
};

/**
 * יצירת slug ייחודי - חשוף לשימוש בקונטרולר
 */
storeSchema.statics.generateSlug = function(baseName) {
  return generateUniqueSlug(this, baseName);
};

const Store = mongoose.model('Store', storeSchema);

export default Store;
