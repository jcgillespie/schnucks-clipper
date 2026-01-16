type BrowserContext = import('playwright-chromium').BrowserContext;
import { getCoupons, clipCoupon, withRetry } from './api.js';
import { logger } from './logger.js';

export interface ClippingSummary {
  total: number;
  clipped: number;
  failed: number;
  skipped: number;
}

export async function clipAllCoupons(context: BrowserContext): Promise<ClippingSummary> {
  logger.info('Starting coupon clipping process...');

  const coupons = await withRetry(() => getCoupons(context));
  const summary: ClippingSummary = {
    total: coupons.length,
    clipped: 0,
    failed: 0,
    skipped: 0,
  };

  logger.info(`Found ${coupons.length} available coupons.`);

  for (const coupon of coupons) {
    try {
      const success = await clipCoupon(context, coupon.id);
      if (success) {
        summary.clipped++;
        logger.info(`Successfully clipped coupon: ${coupon.id} `, {
          description: coupon.description,
        });
      } else {
        summary.failed++;
        logger.warn(`Failed to clip coupon: ${coupon.id} `, { description: coupon.description });
      }
    } catch (error) {
      summary.failed++;
      logger.error(`Error during clipping for coupon ${coupon.id}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Coupon clipping process complete.', summary as unknown as Record<string, unknown>);
  return summary;
}
