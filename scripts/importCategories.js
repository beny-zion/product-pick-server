import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../src/models/Category.js';

dotenv.config();

const categories = [
    {
      "name": "אלקטרוניקה",
      "icon": "📱",
      "subCategories": ["סמארטפונים", "אוזניות", "מטענים"]
    },
    {
      "name": "אופנה",
      "icon": "👕",
      "subCategories": ["חולצות", "מכנסיים", "נעליים"]
    },
    {
      "name": "בית",
      "icon": "🏠",
      "subCategories": ["תאורה", "טקסטיל", "כלי מטבח"]
    },
    {
      "name": "ספורט",
      "icon": "⚽",
      "subCategories": ["ציוד כושר", "בגדי ספורט", "אביזרים"]
    },
    {
      "name": "מחשבים",
      "icon": "💻",
      "subCategories": ["מחשבים ניידים", "מסכים", "אביזרים למחשב"]
    },
    {
      "name": "גינון",
      "icon": "🌱",
      "subCategories": ["כלי עבודה", "צמחים", "עציצים"]
    },
    {
      "name": "נסיעות",
      "icon": "✈️",
      "subCategories": ["מזוודות", "אביזרי נסיעה", "תיקים"]
    },
    {
      "name": "ילדים ותינוקות",
      "icon": "🍼",
      "subCategories": ["צעצועים", "ביגוד תינוקות", "מוצרי תינוקות"]
    },
    {
      "name": "מוזיקה",
      "icon": "🎵",
      "subCategories": ["כלי נגינה", "אביזרי מוזיקה", "אולפן ביתי"]
    },
    {
      "name": "בריאות וטיפוח",
      "icon": "💊",
      "subCategories": ["מוצרי טיפוח", "תוספי תזונה", "ציוד רפואי"]
    },
    {
      "name": "אומנות ויצירה",
      "icon": "🎨",
      "subCategories": ["חומרי יצירה", "כלי ציור", "רקמה"]
    },
    {
      "name": "משחקים וקונסולות",
      "icon": "🎮",
      "subCategories": ["קונסולות משחק", "משחקי וידאו", "אביזרי גיימינג"]
    },
    {
      "name": "רכב",
      "icon": "🚗",
      "subCategories": ["אביזרי רכב", "מוצרי טיפוח לרכב", "חלפים"]
    },
    {
      "name": "טכנולוגיה לבישה",
      "icon": "⌚",
      "subCategories": ["שעונים חכמים", "משקפי VR", "אביזרים"]
    },
    {
      "name": "צילום",
      "icon": "📷",
      "subCategories": ["מצלמות", "עדשות", "חצובות"]
    },
    {
      "name": "טיולים וקמפינג",
      "icon": "🏕️",
      "subCategories": ["אוהלים", "תיקים", "ציוד שטח"]
    },
    {
      "name": "ספרים",
      "icon": "📚",
      "subCategories": ["רומנים", "ספרי לימוד", "ספרי ילדים"]
    },
    {
      "name": "חיות מחמד",
      "icon": "🐾",
      "subCategories": ["מזון לחיות", "אביזרים", "צעצועים לחיות"]
    },
    {
      "name": "גאדג'טים",
      "icon": "🔌",
      "subCategories": ["מנורות חכמות", "מעמדים לטלפונים", "אביזרים"]
    },
    {
      "name": "מטבח",
      "icon": "🍴",
      "subCategories": ["סירים ומחבתות", "מכשירי חשמל למטבח", "סכום"]
    },
    {
      "name": "תחבורה",
      "icon": "🛴",
      "subCategories": ["אופניים", "קורקינטים חשמליים", "קסדות"]
    },
    {
      "name": "צעצועים ומשחקים",
      "icon": "🧸",
      "subCategories": ["משחקי קופסה", "פאזלים", "צעצועי חשיבה"]
    },
    {
      "name": "עיצוב הבית",
      "icon": "🛋️",
      "subCategories": ["ריהוט", "שטיחים", "תמונות"]
    },
    {
      "name": "תיירות ונופש",
      "icon": "🏖️",
      "subCategories": ["חופשות", "צימרים", "פעילויות אקסטרים"]
    },
    {
      "name": "בנייה ושיפוצים",
      "icon": "🔨",
      "subCategories": ["כלי עבודה", "חומרי בניין", "פתרונות אחסון"]
    },
    {
      "name": "שירותים פיננסיים",
      "icon": "💳",
      "subCategories": ["ביטוחים", "הלוואות", "כרטיסי אשראי"]
    },
    {
      "name": "אופניים ותחבורה ירוקה",
      "icon": "🚴‍♂️",
      "subCategories": ["אופניים חשמליים", "אביזרי אופניים", "תחנות טעינה"]
    }
  ]
  ;
  const createSlug = (name) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  };
  
  const importCategories = async () => {
    try {
      await mongoose.connect(process.env.MONGO_CONNECTION);
      console.log('Connected to MongoDB');
  
      await Category.deleteMany({});
      console.log('Cleared existing categories');
  
      for (const mainCat of categories) {
        try {
          const mainSlug = createSlug(mainCat.name) || `category-${Date.now()}`;
          
          const mainCategory = await Category.create({
            name: mainCat.name,
            icon: mainCat.icon,
            slug: mainSlug
          });
          console.log(`Created main category: ${mainCategory.name} (${mainSlug})`);
  
          for (const subCatName of mainCat.subCategories) {
            const subSlug = createSlug(subCatName) || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            await Category.create({
              name: subCatName,
              icon: mainCat.icon,
              parentId: mainCategory._id,
              slug: `${mainSlug}-${subSlug}`
            });
          }
          console.log(`Created sub-categories for: ${mainCategory.name}`);
        } catch (error) {
          console.error(`Error with category ${mainCat.name}:`, error.message);
        }
      }
  
      console.log('Categories import completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error importing categories:', error);
      process.exit(1);
    }
  };
  
  importCategories();