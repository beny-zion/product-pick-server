/**
 * סקריפט אכיפה — מריץ את syncVendorStores ישירות למשתמש ספציפי
 * הרצה:
 *   node --experimental-modules src/scripts/force-sync-vendor.js 67dc87c70af4c7e5529c26c5
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import { connectToMongoDB } from '../config/DB.js';
import { syncVendorStores } from '../services/subscription/subscription.service.js';
import Store from '../models/Store.js';
import FullProduct from '../models/FullProduct.js';

async function main() {
  await connectToMongoDB();
  await new Promise((r) => setTimeout(r, 1000)); // wait for connection

  const userId = process.argv[2];
  if (!userId) {
    console.error('❌ Usage: node force-sync-vendor.js <userId>');
    process.exit(1);
  }

  console.log(`\n🔧 Force-syncing vendor: ${userId}\n`);

  // לפני
  console.log('BEFORE:');
  const before = await Store.find({ vendorId: userId });
  for (const s of before) {
    console.log(`   ${s.isDefault ? '🏠' : '🏪'} ${s.name} — isLocked=${s.isLocked} productCount=${s.productCount}`);
  }

  // סנכרון
  console.log('\n⚙️  Running syncVendorStores...');
  await syncVendorStores(userId);

  // אחרי
  console.log('\nAFTER:');
  const after = await Store.find({ vendorId: userId });
  for (const s of after) {
    const actualCount = await FullProduct.countDocuments({ storeId: s._id, status: 'ACTIVE' });
    console.log(`   ${s.isDefault ? '🏠' : '🏪'} ${s.name} — isLocked=${s.isLocked} productCount=${s.productCount} (actual=${actualCount})`);
  }

  console.log('\n✅ Done\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
