import schedule from 'node-schedule';
import {
  processRecurringPayments,
  resetMonthlyUsage,
} from '../services/subscription/subscription.service.js';

/**
 * Initialize subscription cron jobs
 */
export function initSubscriptionJobs() {
  // Process recurring payments — every day at 8:00 AM
  schedule.scheduleJob('0 8 * * *', async () => {
    console.log('[Cron] Starting recurring payments processing...');
    try {
      const results = await processRecurringPayments();
      console.log('[Cron] Recurring payments results:', results);
    } catch (error) {
      console.error('[Cron] Recurring payments error:', error);
    }
  });

  // Reset monthly usage — 1st of each month at 00:05
  schedule.scheduleJob('5 0 1 * *', async () => {
    console.log('[Cron] Starting monthly usage reset...');
    try {
      const count = await resetMonthlyUsage();
      console.log(`[Cron] Reset usage for ${count} subscriptions`);
    } catch (error) {
      console.error('[Cron] Usage reset error:', error);
    }
  });

  console.log('✅ Subscription cron jobs initialized');
}
