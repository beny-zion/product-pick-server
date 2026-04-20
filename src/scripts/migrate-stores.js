/**
 * סקריפט מיגרציה חד-פעמי — יצירת חנויות ברירת מחדל וקישור מוצרים
 *
 * הרצה:
 *   node --experimental-modules src/scripts/migrate-stores.js
 */
import 'dotenv/config';
import { connectToMongoDB } from '../config/DB.js';
import Store from '../models/Store.js';
import FullProduct from '../models/FullProduct.js';
import User from '../models/User.js';

async function migrate() {
  await connectToMongoDB();

  console.log('🚀 Starting store migration...\n');

  // 1. מוכרים שיש להם מוצרים
  const vendorIds = await FullProduct.distinct('vendorId');
  console.log(`Found ${vendorIds.length} vendors with products`);

  let migratedProducts = 0;

  for (const vendorId of vendorIds) {
    const user = await User.findById(vendorId);
    if (!user) {
      console.warn(`⚠️  Vendor ${vendorId} not found in Users, skipping`);
      continue;
    }

    // יצירת חנות ברירת מחדל
    const store = await Store.getOrCreateDefault(vendorId, user.fullName);

    // קישור מוצרים ללא חנות
    const result = await FullProduct.updateMany(
      { vendorId, $or: [{ storeId: { $exists: false } }, { storeId: null }] },
      { $set: { storeId: store._id } }
    );

    // עדכון ספירת מוצרים
    const count = await FullProduct.countDocuments({ storeId: store._id, status: 'ACTIVE' });
    await Store.findByIdAndUpdate(store._id, { productCount: count });

    migratedProducts += result.modifiedCount;
    console.log(`✅ ${user.fullName}: store "${store.name}" → ${result.modifiedCount} products linked`);
  }

  // 2. מוכרים ללא מוצרים — גם הם צריכים חנות ברירת מחדל
  const vendorsWithoutProducts = await User.find({
    isVendor: true,
    _id: { $nin: vendorIds },
  });

  for (const vendor of vendorsWithoutProducts) {
    await Store.getOrCreateDefault(vendor._id, vendor.fullName);
    console.log(`✅ ${vendor.fullName}: empty default store created`);
  }

  console.log(`\n🎉 Migration complete! ${migratedProducts} products linked to stores.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
