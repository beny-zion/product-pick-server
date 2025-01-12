import Category from '../models/Category.js';
import Product from '../models/Product.js';

// קבלת קטגוריות פעילות (שיש להן מוצרים)
export const getActiveCategories = async (req, res) => {
  try {
    // מוצאים את כל הקטגוריות שמשויכות למוצרים
    const activeCategories = await Product.aggregate([
      // פורסים את מערך הקטגוריות
      { $unwind: "$mainCategory" },
      
      // מקבצים לפי קטגוריה וסופרים מוצרים
      { 
        $group: {
          _id: "$mainCategory",
          productCount: { $sum: 1 }
        }
      },
      
      // מחברים עם מודל הקטגוריות לקבלת פרטי הקטגוריה
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      
      // פורסים את תוצאת ה-lookup
      { $unwind: "$categoryDetails" },
      
      // מעצבים את הפלט הסופי
      {
        $project: {
          _id: "$categoryDetails._id",
          name: "$categoryDetails.name",
          icon: "$categoryDetails.icon",
          productCount: 1
        }
      },
      
      // ממיינים לפי שם
      { $sort: { name: 1 } }
    ]);

    res.json({
      success: true,
      categories: activeCategories
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת קטגוריות פעילות',
      error: error.message
    });
  }
};

// קבלת כל הקטגוריות הראשיות
export const getMainCategories = async (req, res) => {
  try {
    const categories = await Category.find({ parentId: null })
      .populate('subCategories')
      .sort({ name: 1 });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת קטגוריות',
      error: error.message
    });
  }
};

// קבלת תת-קטגוריות של קטגוריה מסוימת
export const getSubCategories = async (req, res) => {
  try {
    const { parentId } = req.params;
    const subCategories = await Category.find({ parentId })
      .sort({ name: 1 });

    res.json({
      success: true,
      subCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת תת-קטגוריות',
      error: error.message
    });
  }
};

// הוספת קטגוריה חדשה (למנהל מערכת)
export const addCategory = async (req, res) => {
  try {
    const { name, icon, parentId } = req.body;
    const category = new Category({
      name,
      icon,
      parentId: parentId || null
    });
    await category.save();

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בהוספת קטגוריה',
      error: error.message
    });
  }
};

// סקריפט לייבוא קטגוריות ראשוני
export const importCategories = async (categoriesData) => {
  try {
    for (const mainCat of categoriesData) {
      // יצירת קטגוריה ראשית
      const mainCategory = new Category({
        name: mainCat.name,
        icon: mainCat.icon
      });
      await mainCategory.save();

      // יצירת תת קטגוריות
      for (const subCatName of mainCat.subCategories) {
        const subCategory = new Category({
          name: subCatName,
          icon: mainCat.icon,
          parentId: mainCategory._id
        });
        await subCategory.save();
      }
    }
    console.log('Categories imported successfully');
  } catch (error) {
    console.error('Error importing categories:', error);
    throw error;
  }
};