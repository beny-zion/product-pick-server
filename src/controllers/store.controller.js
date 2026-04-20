import Store from '../models/Store.js';
import FullProduct from '../models/FullProduct.js';
import { sanitizeHtml } from '../middlewares/sanitizer.middleware.js';
import { syncVendorStores } from '../services/subscription/subscription.service.js';
import mongoose from 'mongoose';

export const StoreController = {
  /**
   * קבלת כל החנויות של המוכר (כולל סנכרון עקביות)
   */
  async getMyStores(req, res) {
    try {
      // סנכרון self-healing — מתקן dual-default, אוכף מגבלה, מסנכרן productCount
      await syncVendorStores(req.user.id);

      const stores = await Store.find({ vendorId: req.user.id })
        .sort({ isDefault: -1, createdAt: 1 });

      res.json({
        success: true,
        data: stores,
      });
    } catch (error) {
      console.error('Error getting vendor stores:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * קבלת חנות ספציפית של המוכר
   */
  async getMyStore(req, res) {
    try {
      const store = await Store.findOne({
        _id: req.params.storeId,
        vendorId: req.user.id,
      });

      if (!store) {
        return res.status(404).json({ success: false, message: 'חנות לא נמצאה' });
      }

      res.json({ success: true, data: store });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * יצירת חנות חדשה
   */
  async createStore(req, res) {
    try {
      const { name, description, logo, coverImage } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'שם החנות הוא שדה חובה' });
      }

      const cleanName = sanitizeHtml(name.trim());
      const cleanDescription = description ? sanitizeHtml(description.trim()) : '';

      const slug = await Store.generateSlug(cleanName);

      const store = await Store.create({
        vendorId: req.user.id,
        name: cleanName,
        slug,
        description: cleanDescription,
        logo: logo || '',
        coverImage: coverImage || '',
        isDefault: false,
      });

      res.status(201).json({ success: true, data: store });
    } catch (error) {
      console.error('Error creating store:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * עדכון חנות
   */
  async updateStore(req, res) {
    try {
      const store = await Store.findOne({
        _id: req.params.storeId,
        vendorId: req.user.id,
      });

      if (!store) {
        return res.status(404).json({ success: false, message: 'חנות לא נמצאה' });
      }

      if (store.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'החנות נעולה. שדרג לפרו כדי לשחרר',
          code: 'STORE_LOCKED',
        });
      }

      const { name, description, logo, coverImage, visibility } = req.body;

      if (name !== undefined) {
        store.name = sanitizeHtml(name.trim());
        // עדכון slug אם השם השתנה
        store.slug = await Store.generateSlug(store.name);
      }
      if (description !== undefined) store.description = sanitizeHtml(description.trim());
      if (logo !== undefined) store.logo = logo;
      if (coverImage !== undefined) store.coverImage = coverImage;
      if (visibility !== undefined && ['PUBLIC', 'PRIVATE'].includes(visibility)) {
        store.visibility = visibility;
      }

      await store.save();

      res.json({ success: true, data: store });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * מחיקת חנות (לא ניתן למחוק חנות ברירת מחדל)
   */
  async deleteStore(req, res) {
    try {
      const store = await Store.findOne({
        _id: req.params.storeId,
        vendorId: req.user.id,
      });

      if (!store) {
        return res.status(404).json({ success: false, message: 'חנות לא נמצאה' });
      }

      if (store.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'לא ניתן למחוק את חנות ברירת המחדל',
        });
      }

      if (store.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'לא ניתן למחוק חנות נעולה. שדרג לפרו כדי לשחרר',
          code: 'STORE_LOCKED',
        });
      }

      // העברת כל המוצרים לחנות ברירת המחדל
      const defaultStore = await Store.findOne({ vendorId: req.user.id, isDefault: true });

      if (defaultStore) {
        const moveResult = await FullProduct.updateMany(
          { storeId: store._id },
          { $set: { storeId: defaultStore._id } }
        );

        // עדכון ספירת מוצרים
        if (moveResult.modifiedCount > 0) {
          await Store.findByIdAndUpdate(defaultStore._id, {
            $inc: { productCount: moveResult.modifiedCount },
          });
        }
      }

      await Store.findByIdAndDelete(store._id);

      res.json({ success: true, message: 'החנות נמחקה, המוצרים הועברו לחנות ברירת המחדל' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PUBLIC: קבלת כל החנויות הציבוריות של מוכר
   */
  async getVendorStores(req, res) {
    try {
      const { vendorId } = req.params;

      const stores = await Store.find({
        vendorId,
        visibility: 'PUBLIC',
        isLocked: { $ne: true },
      }).sort({ isDefault: -1, createdAt: 1 });

      res.json({ success: true, data: stores });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PUBLIC: קבלת חנות ציבורית לפי slug או ID
   */
  async getPublicStore(req, res) {
    try {
      const { storeIdOrSlug } = req.params;

      const baseFilter = { visibility: 'PUBLIC', isLocked: { $ne: true } };
      let store;
      if (mongoose.Types.ObjectId.isValid(storeIdOrSlug)) {
        store = await Store.findOne({ _id: storeIdOrSlug, ...baseFilter })
          .populate('vendorId', 'fullName profileImage bio');
      }
      if (!store) {
        store = await Store.findOne({ slug: storeIdOrSlug, ...baseFilter })
          .populate('vendorId', 'fullName profileImage bio');
      }

      if (!store) {
        return res.status(404).json({ success: false, message: 'חנות לא נמצאה' });
      }

      res.json({
        success: true,
        data: {
          store: {
            _id: store._id,
            name: store.name,
            slug: store.slug,
            description: store.description,
            logo: store.logo,
            coverImage: store.coverImage,
            productCount: store.productCount,
          },
          vendor: store.vendorId,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PUBLIC: קבלת מוצרים של חנות
   */
  async getStoreProducts(req, res) {
    try {
      const { storeIdOrSlug } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const skip = (page - 1) * limit;

      // מציאת החנות
      const baseFilter = { visibility: 'PUBLIC', isLocked: { $ne: true } };
      let store;
      if (mongoose.Types.ObjectId.isValid(storeIdOrSlug)) {
        store = await Store.findOne({ _id: storeIdOrSlug, ...baseFilter });
      }
      if (!store) {
        store = await Store.findOne({ slug: storeIdOrSlug, ...baseFilter });
      }

      if (!store) {
        return res.status(404).json({ success: false, message: 'חנות לא נמצאה' });
      }

      const filter = { storeId: store._id, status: 'ACTIVE' };

      const products = await FullProduct.find(filter)
        .populate('vendorId', 'fullName profileImage')
        .populate('storeId', 'name slug logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalProducts = await FullProduct.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / limit);

      res.json({
        success: true,
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          hasMore: page < totalPages,
          limit,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
