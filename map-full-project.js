/**
 * סקריפט למיפוי מבנה הפרויקט המלא (ESM Version)
 * 
 * הוראות הרצה:
 * 1. התקן חבילות נדרשות: npm install fs-extra path
 * 2. שמור את הקובץ הזה בתיקיית השורש של הפרויקט בשם map-full-project.js
 * 3. הרץ את הסקריפט: node map-full-project.js
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// הגדרת נתיב התחלתי (תיקיית הפרויקט הראשית)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// התיקייה הנוכחית היא תיקיית השורש של הפרויקט
const ROOT_DIR = __dirname;
const OUTPUT_FILE = path.join(__dirname, 'full-project-structure.json');
const SUMMARY_FILE = path.join(__dirname, 'full-project-summary.md');

// תבניות קבצים לסינון - רק node_modules ו-.git
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/
];

// בדיקה האם להתעלם מקובץ או תיקייה
function shouldIgnore(itemPath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(itemPath));
}

// פונקציה רקורסיבית למיפוי תיקייה
async function mapDirectory(dirPath, relativePath = '') {
  const items = await fs.readdir(dirPath);
  const result = {
    path: relativePath || '/',
    type: 'directory',
    items: []
  };

  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const itemRelativePath = path.join(relativePath, item);

    if (shouldIgnore(itemPath)) continue;

    const stats = await fs.stat(itemPath);

    if (stats.isDirectory()) {
      const subDir = await mapDirectory(itemPath, itemRelativePath);
      result.items.push(subDir);
    } else {
      const extension = path.extname(item);
      result.items.push({
        name: item,
        path: itemRelativePath,
        type: 'file',
        extension,
        size: stats.size,
        modified: stats.mtime
      });
    }
  }

  return result;
}

// פונקציה ליצירת סיכום בפורמט מרקדאון
function generateSummary(structure) {
  let summary = '# סיכום מבנה הפרויקט\n\n';
  
  function processDirectory(dir, level = 0) {
    const indent = '  '.repeat(level);
    const prefix = level === 0 ? '## ' : `${indent}- `;
    
    summary += `${prefix}תיקייה: ${dir.path}\n`;
    
    const filesByExtension = {};
    
    const sortedItems = [...dir.items].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name?.localeCompare(b.name) || a.path?.localeCompare(b.path);
    });
    
    for (const item of sortedItems) {
      if (item.type === 'directory') {
        processDirectory(item, level + 1);
      } else {
        const ext = item.extension || 'unknown';
        if (!filesByExtension[ext]) {
          filesByExtension[ext] = [];
        }
        filesByExtension[ext].push(item);
      }
    }
    
    if (Object.keys(filesByExtension).length > 0) {
      summary += `${indent}  קבצים:\n`;
      
      for (const [ext, files] of Object.entries(filesByExtension)) {
        summary += `${indent}    ${ext} (${files.length}): `;
        
        if (files.length <= 5) {
          summary += files.map(f => path.basename(f.path)).join(', ');
        } else {
          summary += `${files.length} קבצים, למשל: ${files.slice(0, 3).map(f => path.basename(f.path)).join(', ')}...`;
        }
        
        summary += '\n';
      }
    }
    
    summary += '\n';
  }
  
  processDirectory(structure);
  
  // הוסף סיכום כללי
  let totalFiles = 0;
  let totalDirectories = 0;
  
  function countItems(dir) {
    totalDirectories++;
    
    for (const item of dir.items) {
      if (item.type === 'directory') {
        countItems(item);
      } else {
        totalFiles++;
      }
    }
  }
  
  countItems(structure);
  
  summary += `## סיכום כללי\n`;
  summary += `- סך הכל תיקיות: ${totalDirectories}\n`;
  summary += `- סך הכל קבצים: ${totalFiles}\n`;
  
  return summary;
}

// פונקציה ראשית למיפוי הפרויקט
async function mapProject() {
  try {
    console.log(`מתחיל מיפוי מתיקייה: ${ROOT_DIR}`);
    console.log(`התיקיות הבאות יסוננו: ${IGNORE_PATTERNS.map(p => p.toString()).join(', ')}`);
    
    const structure = await mapDirectory(ROOT_DIR);
    await fs.writeJson(OUTPUT_FILE, structure, { spaces: 2 });
    
    console.log(`נוצר קובץ מיפוי: ${OUTPUT_FILE}`);
    
    const summary = generateSummary(structure);
    await fs.writeFile(SUMMARY_FILE, summary);
    
    console.log(`נוצר דוח סיכום: ${SUMMARY_FILE}`);
    
    return structure;
  } catch (err) {
    console.error('שגיאה במיפוי הפרויקט:', err);
    throw err;
  }
}

// הרצת הסקריפט
mapProject().then(() => {
  console.log('המיפוי הסתיים בהצלחה!');
}).catch(err => {
  console.error('שגיאה בהרצת הסקריפט:', err);
});