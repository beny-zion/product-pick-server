/**
 * בדיקה ישירה של enforceStoreDowngrade
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import { connectToMongoDB } from '../config/DB.js';
import Store from '../models/Store.js';
import FullProduct from '../models/FullProduct.js';
import { getPlanLimits } from '../config/plans.config.js';

async function main() {
  await connectToMongoDB();
  await new Promise((r) => setTimeout(r, 1500));

  const userId = '67dc87c70af4c7e5529c26c5';
  const targetPlan = 'FREE';

  console.log('\n🔍 Testing enforceStoreDowngrade logic directly\n');

  const maxStores = getPlanLimits(targetPlan).maxStores;
  console.log(`targetPlan: ${targetPlan}, maxStores: ${maxStores}`);

  const defaultStore = await Store.findOne({ vendorId: userId, isDefault: true });
  console.log(`defaultStore: ${defaultStore?.name} (${defaultStore?._id})`);

  const extraStores = await Store.find({
    vendorId: userId,
    isDefault: false,
    isLocked: false,
  }).sort({ createdAt: 1 });
  console.log(`extraStores: ${extraStores.length}`);
  for (const s of extraStores) {
    console.log(`   - ${s.name} (isLocked=${s.isLocked}, isDefault=${s.isDefault})`);
  }

  const keepCount = Math.max(0, maxStores - 1);
  const toLock = extraStores.slice(keepCount);
  console.log(`\nkeepCount: ${keepCount}, toLock: ${toLock.length}`);

  for (const store of toLock) {
    console.log(`\n   Processing: ${store.name}`);
    const moveResult = await FullProduct.updateMany(
      { storeId: store._id },
      { $set: { storeId: defaultStore._id } }
    );
    console.log(`   moved ${moveResult.modifiedCount} products`);

    if (moveResult.modifiedCount > 0) {
      await Store.findByIdAndUpdate(defaultStore._id, {
        $inc: { productCount: moveResult.modifiedCount },
      });
    }

    const lockResult = await Store.findByIdAndUpdate(
      store._id,
      {
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: 'PLAN_DOWNGRADE',
        productCount: 0,
      },
      { new: true }
    );
    console.log(`   after lock: isLocked=${lockResult.isLocked}`);
  }

  console.log('\n✅ Done. Final state:');
  const after = await Store.find({ vendorId: userId });
  for (const s of after) {
    console.log(`   ${s.isDefault ? '🏠' : '🏪'} ${s.name} — isLocked=${s.isLocked} productCount=${s.productCount}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
