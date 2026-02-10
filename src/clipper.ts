import { getCoupons, clipCoupon, withRetry, SessionData } from './api.js';
import { logger } from './logger.js';
import { config } from './config.js';

export interface ClippingSummary {
  total: number;
  clipped: number;
  failed: number;
  skipped: number;
}

export async function clipAllCoupons(sessionData: SessionData): Promise<ClippingSummary> {
  logger.debug('Starting coupon clipping process...');

  const coupons = await withRetry(() => getCoupons(sessionData));
  const summary: ClippingSummary = {
    total: coupons.length,
    clipped: 0,
    failed: 0,
    skipped: 0,
  };

  logger.debug(`Found ${coupons.length} available coupons.`);

  const batchSize = config.clipConcurrency;
  logger.info(`Processing coupons in batches of ${batchSize}`);

  // Process coupons in batches
  for (let i = 0; i < coupons.length; i += batchSize) {
    const batch = coupons.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(coupons.length / batchSize);

    logger.info(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} coupons)`);

    // Execute all clips in the batch concurrently with retry logic
    const results = await Promise.allSettled(
      batch.map((coupon) =>
        withRetry(() => clipCoupon(sessionData, coupon.id)).then((success) => ({
          coupon,
          success,
        }))
      )
    );

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { coupon, success } = result.value;
        if (success) {
          summary.clipped++;
          // Removed per-coupon success logging to reduce log volume
          // Success details are logged in the summary below
        } else {
          summary.failed++;
          logger.warn(`Failed to clip coupon: ${coupon.id}`, { description: coupon.description });
        }
      } else {
        // This case handles when withRetry exhausts all retries
        summary.failed++;
        const error = result.reason;
        logger.error(`Error during clipping (retries exhausted)`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  logger.info('Coupon clipping process complete.', summary as unknown as Record<string, unknown>);
  return summary;
}
