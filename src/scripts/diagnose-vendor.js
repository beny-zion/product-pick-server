/**
 * סקריפט אבחון — מציג מצב מלא של מוכר ספציפי
 * הרצה:
 *   node --experimental-modules src/scripts/diagnose-vendor.js 67dc87c70af4c7e5529c26c5
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import { connectToMongoDB } from '../config/DB.js';
import User from '../models/User.js';
import Store from '../models/Store.js';
import FullProduct from '../models/FullProduct.js';
import Subscription from '../models/Subscription.js';

async function diagnose() {
  await connectToMongoDB();

  const userId = process.argv[2];
  if (!userId) {
    console.error('❌ Usage: node diagnose-vendor.js <userId>');
    process.exit(1);
  }

  console.log(`\n🔎 Diagnosing vendor: ${userId}\n`);

  // 1. User
  const user = await User.findById(userId);
  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }
  console.log('👤 USER:');
  console.log(`   name:       ${user.fullName}`);
  console.log(`   email:      ${user.email}`);
  console.log(`   isVendor:   ${user.isVendor}`);
  console.log(`   role:       ${user.role}`);

  // 2. Subscription
  const sub = await Subscription.findOne({ userId });
  console.log('\n💳 SUBSCRIPTION:');
  if (!sub) {
    console.log('   ⚠️  No subscription record!');
  } else {
    console.log(`   plan:       ${sub.plan}`);
    console.log(`   status:     ${sub.status}`);
    console.log(`   cancelAtPeriodEnd: ${sub.cancelAtPeriodEnd}`);
    console.log(`   period:     ${sub.currentPeriodStart} → ${sub.currentPeriodEnd}`);
  }

  // 3. Stores
  const stores = await Store.find({ vendorId: userId }).sort({ createdAt: 1 });
  console.log(`\n🏪 STORES (${stores.length}):`);
  for (const s of stores) {
    console.log(`   • ${s.name}`);
    console.log(`     _id:        ${s._id}`);
    console.log(`     slug:       ${s.slug}`);
    console.log(`     isDefault:  ${s.isDefault}`);
    console.log(`     isLocked:   ${s.isLocked}`);
    console.log(`     productCount (stored): ${s.productCount}`);
    console.log(`     visibility: ${s.visibility}`);
    console.log(`     created:    ${s.createdAt}`);

    const actualCount = await FullProduct.countDocuments({ storeId: s._id, status: 'ACTIVE' });
    console.log(`     productCount (actual):  ${actualCount}`);
    if (s.productCount !== actualCount) {
      console.log(`     ⚠️  COUNT MISMATCH!`);
    }
  }

  // 4. Invariant checks
  console.log('\n🔍 INVARIANT CHECKS:');
  const defaults = stores.filter((s) => s.isDefault);
  if (defaults.length === 0) {
    console.log('   ❌ I1: No default store!');
  } else if (defaults.length > 1) {
    console.log(`   ❌ I1: MULTIPLE default stores (${defaults.length})!`);
  } else {
    console.log('   ✅ I1: Exactly one default store');
  }

  // 5. Products without storeId
  const orphans = await FullProduct.countDocuments({
    vendorId: userId,
    $or: [{ storeId: { $exists: false } }, { storeId: null }],
  });
  if (orphans > 0) {
    console.log(`   ❌ I3: ${orphans} products without storeId!`);
  } else {
    console.log('   ✅ I3: All products have storeId');
  }

  // 6. Products total
  const totalProducts = await FullProduct.countDocuments({ vendorId: userId });
  const activeProducts = await FullProduct.countDocuments({ vendorId: userId, status: 'ACTIVE' });
  console.log(`\n📦 PRODUCTS: ${totalProducts} total, ${activeProducts} active`);

  // 7. Plan vs active stores
  if (sub) {
    const { getPlanLimits } = await import('../config/plans.config.js');
    const maxStores = getPlanLimits(sub.plan).maxStores;
    const activeStores = stores.filter((s) => !s.isLocked).length;
    console.log(`\n⚖️  PLAN LIMITS:`);
    console.log(`   plan allows:  ${maxStores} stores`);
    console.log(`   active now:   ${activeStores} stores`);
    if (activeStores > maxStores) {
      console.log(`   ❌ ${activeStores - maxStores} stores should be locked!`);
    } else {
      console.log('   ✅ Within plan limit');
    }
  }

  console.log('\n✅ Done\n');
  process.exit(0);
}

diagnose().catch((err) => {
  console.error('❌ Diagnosis failed:', err);
  process.exit(1);
});
