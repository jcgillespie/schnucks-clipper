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

  const concurrency = config.clipConcurrency;
  logger.info(`Processing ${coupons.length} coupons with concurrency ${concurrency}`);

  // Use a worker pool to maintain constant concurrency and prevent slow requests from blocking batches
  let currentIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, coupons.length) }, async () => {
    while (currentIndex < coupons.length) {
      const index = currentIndex++;
      const coupon = coupons[index];
      if (!coupon) break;

      try {
        const success = await withRetry(() => clipCoupon(sessionData, coupon.id));
        if (success) {
          summary.clipped++;
        } else {
          summary.failed++;
          logger.warn(`Failed to clip coupon: ${coupon.id}`, { description: coupon.description });
        }
      } catch (error) {
        summary.failed++;
        logger.error(`Error during clipping (retries exhausted)`, {
          couponId: coupon.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  await Promise.all(workers);

  logger.info('Coupon clipping process complete.', summary as unknown as Record<string, unknown>);
  return summary;
}
