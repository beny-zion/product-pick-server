import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  aliExpressUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v.includes('aliexpress.com');
      },
      message: 'URL must be from AliExpress'
    }
  },
  affiliateUrl: String,
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  displayImage: {
    type: String,
    required: true
  },
  category: {
    main: {
      type: String,
      required: true
    },
    sub: {
      type: String,
      required: true
    }
  },
  apiData: {
    images: [String],
    specifications: Object,
    price: {           // העברנו את המחיר לכאן
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: Number, // מחיר לפני הנחה אם קיים
    discount: Number      // אחוז ההנחה אם קיים
  },
  stats: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    avgViewTime: { type: Number, default: 0 }
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware לעדכון תאריך עדכון אחרון
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;