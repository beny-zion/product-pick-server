import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rawHtml: {
    type: String,    // שמירת ה-HTML המקורי
    required: true
  },
  affiliateLink: {   // מחולץ מה-HTML
    type: String,
    required: true
  },
  imageUrl: {        // מחולץ מה-HTML
    type: String,
    required: true
  },
  recommendation: {  // ההמלצה של המוכר
    type: String,
    required: true,
    maxLength: 1000
  },
  // categories: [{
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Category',
  //   required: true
  // }],
  mainCategory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// פונקציה לחילוץ הלינק והתמונה מה-HTML
productSchema.statics.extractFromHtml = function(html) {
  try {
    const linkMatch = html.match(/href="([^"]+)"/);
    const imageMatch = html.match(/src="([^"]+)"/);
    
    if (!linkMatch || !imageMatch) {
      throw new Error('Invalid HTML format');
    }

    return {
      affiliateLink: linkMatch[1],
      imageUrl: imageMatch[1].startsWith('//') ? 'https:' + imageMatch[1] : imageMatch[1]
    };
  } catch (error) {
    throw new Error('Failed to parse product HTML');
  }
};
productSchema.virtual('allCategories').get(function() {
  return this.populate('categories mainCategory');
});

const Product = mongoose.model('Product', productSchema);
export default Product;
