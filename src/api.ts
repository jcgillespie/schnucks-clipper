type BrowserContext = import('playwright-chromium').BrowserContext;
import { config } from './config.js';
import { logger } from './logger.js';

export interface Coupon {
  id: string; // Internalized as string for consistency
  description: string;
  isClipped: boolean;
  source?: string;
}

interface RawCoupon {
  id: number | string;
  description: string | null;
  clippedDate: string | null;
  expired: boolean;
}

/**
 * Extracts the schnucks-client-id from the session's localStorage
 */
async function getClientId(context: BrowserContext): Promise<string> {
  const state = await context.storageState();
  const origin = state.origins.find(
    (o) => o.origin === config.schnucksBaseUrl || o.origin.includes('schnucks.com'),
  );
  const clientIdObj = origin?.localStorage.find((item) => item.name === 'schnucks-client-id');

  if (!clientIdObj) {
    throw new Error(
      'MISSING_CLIENT_ID: schnucks-client-id not found in session localStorage. Please re-authenticate.',
    );
  }

  logger.debug('Extracted schnucks-client-id from localStorage', { clientId: clientIdObj.value });
  return clientIdObj.value;
}

const getHeaders = (clientId: string) => ({
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
  'X-SCHNUCKS-CLIENT-ID': clientId,
  Accept: '*/*',
  Referer: `${config.schnucksBaseUrl}/digital-coupons/all`,
});

export async function getCoupons(context: BrowserContext): Promise<Coupon[]> {
  const page = await context.newPage();
  const url = `${config.schnucksBaseUrl}/api/coupon-api/v1/coupons`;
  const clientId = await getClientId(context);

  try {
    logger.debug('Fetching coupons from API', { url, clientId });

    await page.setExtraHTTPHeaders(getHeaders(clientId));
    const response = await page.goto(url);

    if (!response || !response.ok()) {
      const status = response?.status();
      if (status === 401 || status === 403) {
        throw new Error('AUTH_FAILED: Session has expired or is invalid.');
      }
      throw new Error(`API_ERROR: Failed to fetch coupons.Status: ${status} `);
    }

    const { data } = (await response.json()) as { data: RawCoupon[] | null };
    return (data || [])
      .filter((c: RawCoupon) => c.clippedDate === null && c.expired === false)
      .map((c: RawCoupon) => ({
        id: String(c.id),
        description: c.description || 'No description',
        isClipped: false,
      }));
  } finally {
    await page.close();
  }
}

export async function clipCoupon(context: BrowserContext, couponId: string): Promise<boolean> {
  const url = `${config.schnucksBaseUrl}/api/coupon-api/v1/clipped`;
  const clientId = await getClientId(context);

  try {
    logger.debug('Clipping coupon via RequestContext', { couponId, url, clientId });

    const response = await context.request.post(url, {
      headers: {
        ...getHeaders(clientId),
        'Content-Type': 'text/plain;charset=UTF-8',
        Origin: config.schnucksBaseUrl,
      },
      data: JSON.stringify({ couponId: Number(couponId) }),
    });

    if (!response.ok()) {
      const text = await response.text();
      logger.warn('Failed to clip coupon', {
        couponId,
        status: response.status(),
        body: text,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error clipping coupon', {
      couponId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    logger.warn('Operation failed, retrying...', { retriesLeft: retries - 1, delay });
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}
