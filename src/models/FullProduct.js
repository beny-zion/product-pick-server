/* needed */
import mongoose from "mongoose";

const fullProductSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // מזהה מוצר באלי אקספרס
  aliExpressProductId: {
    type: String,
    required: true,
    index: true
  },
  // כותרת המוצר
  title: {
    type: String, 
    required: true
  },
  // תמונה ראשית
  displayImage: {
    type: String,
    required: true
  },
  // שאר התמונות
  images: [String],
  // קישור שיווקי
  affiliateLink: {
    type: String,
    required: true
  },
  // האם זה לינק שיווקי של המשתמש
  isCustomAffiliateLink: {
    type: Boolean,
    default: false
  },
  // המלצת המשתמש
  recommendation: {
    type: String,
    required: true,
    maxLength: 1000
  },
  // נתוני אלי אקספרס
  aliExpressData: {
    price: {
      type: Number,
      index: true
    },
    originalPrice: Number,
    discount: String,
    categories: {
      main: {
        id: {
          type: String,
          index: true
        },
        name: String
      },
      sub: {
        id: {
          type: String,
          index: true
        },
        name: String
      }
    },
    stats: {
      commission: String,
      sales: {
        type: Number,
        index: true
      },
      rating: {
        type: String,
        index: true
      }
    },
    lastChecked: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// עדכון updatedAt לפני שמירה
fullProductSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// אינדקס טקסט מורכב עם משקלים
fullProductSchema.index({ 
  title: 'text', 
  recommendation: 'text',
  'aliExpressData.categories.main.name': 'text',
  'aliExpressData.categories.sub.name': 'text'
}, {
  weights: {
    title: 10,
    recommendation: 5,
    'aliExpressData.categories.main.name': 3,
    'aliExpressData.categories.sub.name': 2
  },
  name: 'product_text_search'
});

// אינדקסים מורכבים לביצועים
fullProductSchema.index({ status: 1, vendorId: 1 }, { name: 'status_vendor' });
fullProductSchema.index({ status: 1, 'aliExpressData.price': 1 }, { name: 'status_price' });
fullProductSchema.index({ status: 1, 'aliExpressData.stats.rating': -1 }, { name: 'status_rating' });
fullProductSchema.index({ status: 1, createdAt: -1 }, { name: 'status_created' });

// אינדקס לחיפוש קטגוריות
fullProductSchema.index({ 
  'aliExpressData.categories.main.id': 1,
  'aliExpressData.categories.sub.id': 1,
  status: 1 
}, { name: 'category_search' });

// פונקציה לבדיקת אינדקסים - רק אם לא קיימים
fullProductSchema.statics.ensureIndexes = async function() {
  try {
    // בדוק אם האינדקסים כבר קיימים
    const existingIndexes = await this.collection.getIndexes();
    const indexNames = Object.keys(existingIndexes);
    
    // בדוק אם יש כבר אינדקס טקסט
    const hasTextIndex = indexNames.some(name => name.includes('text'));
    
    if (hasTextIndex) {
      console.log('✓ Indexes already exist, skipping creation');
      return;
    }
    
    // צור אינדקסים רק אם לא קיימים
    console.log('Creating new indexes...');
    await this.createIndexes();
    console.log('✓ All indexes created successfully');
    
    // הצג אינדקסים קיימים
    const newIndexes = await this.collection.getIndexes();
    console.log('Current indexes:', Object.keys(newIndexes));
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

const FullProduct = mongoose.model('FullProduct', fullProductSchema);

// הסר את הקריאה האוטומטית - תריץ ידנית כשצריך
// FullProduct.ensureIndexes();

export default FullProduct;