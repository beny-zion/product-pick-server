import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  }
}, {
  timestamps: true
});

// אינדקס מורכב שמבטיח ייחודיות רק בתוך אותה קטגוריית אב
categorySchema.index({ name: 1, parentId: 1 }, { 
  unique: true,
  partialFilterExpression: { parentId: { $exists: true } }
});

// מידלוור ליצירת slug מהשם
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    
    if (this.parentId) {
      // תת-קטגוריה - כולל מזהה הקטגוריה הראשית
      this.slug = `${this.parentId}-${this.name}-${randomString}`.toLowerCase();
    } else {
      // קטגוריה ראשית
      this.slug = `${this.name}-${randomString}`.toLowerCase();
    }
  }
  next();
});

// וירטואל לקבלת תת קטגוריות
categorySchema.virtual('subCategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

const Category = mongoose.model('Category', categorySchema);

// מחיקת האינדקס הישן אם קיים
Category.collection.dropIndex('name_1')
  .catch(() => console.log('No old index to drop'));

export default Category;