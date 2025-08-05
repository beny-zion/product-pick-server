/* needed */
// controllers/favoriteController.js
import Favorite from '../models/Favorite.js';

// הוספת מוצר למועדפים
export const addFavorite = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    // בדיקה שהמוצר לא קיים כבר
    const existingFavorite = await Favorite.findOne({ userId, productId });
    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'המוצר כבר נמצא ברשימת המועדפים'
      });
    }

    const favorite = new Favorite({ userId, productId });
    await favorite.save();

    res.status(201).json({
      success: true,
      favorite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בהוספת מוצר למועדפים',
      error: error.message
    });
  }
};

// הסרת מוצר מהמועדפים
export const removeFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const result = await Favorite.findOneAndDelete({ userId, productId });
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'המוצר לא נמצא ברשימת המועדפים'
      });
    }

    res.json({
      success: true,
      message: 'המוצר הוסר מרשימת המועדפים'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בהסרת מוצר מהמועדפים',
      error: error.message
    });
  }
};

// קבלת רשימת המוצרים המועדפים
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user._id;

    const favorites = await Favorite.find({ userId })
      .populate({
        path: 'productId',
        populate: {
          path: 'vendorId',
          select: 'fullName profileImage'
        }
      })
      .sort({ createdAt: -1 });

    const formattedFavorites = favorites.map(fav => ({
      _id: fav._id,
      product: fav.productId,
      createdAt: fav.createdAt
    }));

    res.json({
      success: true,
      favorites: formattedFavorites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת מוצרים מועדפים',
      error: error.message
    });
  }
};

// בדיקה אם מוצר נמצא ברשימת המועדפים
export const checkFavoriteStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.json({
        success: true,
        isFavorite: false
      });
    }

    const favorite = await Favorite.findOne({ userId, productId });
    
    res.json({
      success: true,
      isFavorite: !!favorite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת סטטוס מועדף',
      error: error.message
    });
  }
};