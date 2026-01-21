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

export interface SessionData {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
  }>;
  clientId: string;
}

/**
 * Extracts the schnucks-client-id directly from session data
 */
function getClientId(sessionData: SessionData): string {
  if (!sessionData.clientId) {
    throw new Error(
      'MISSING_CLIENT_ID: schnucks-client-id not found in session data. Please re-authenticate.',
    );
  }

  logger.debug('Using stored schnucks-client-id', { clientId: sessionData.clientId });
  return sessionData.clientId;
}

function getCookiesHeader(sessionData: SessionData): string {
  return sessionData.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

const getHeaders = (clientId: string, sessionData: SessionData) => ({
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
  'X-SCHNUCKS-CLIENT-ID': clientId,
  Accept: '*/*',
  Referer: `${config.schnucksBaseUrl}/digital-coupons/all`,
  Cookie: getCookiesHeader(sessionData),
});

export async function getCoupons(sessionData: SessionData): Promise<Coupon[]> {
  const url = `${config.schnucksBaseUrl}/api/coupon-api/v1/coupons`;
  const clientId = getClientId(sessionData);

  logger.debug('Fetching coupons from API', { url, clientId });

  const response = await fetch(url, {
    headers: getHeaders(clientId, sessionData),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_FAILED: Session has expired or is invalid.');
    }
    throw new Error(`API_ERROR: Failed to fetch coupons.Status: ${response.status} `);
  }

  const { data } = (await response.json()) as { data: RawCoupon[] | null };
  return (data || [])
    .filter((c: RawCoupon) => c.clippedDate === null && c.expired === false)
    .map((c: RawCoupon) => ({
      id: String(c.id),
      description: c.description || 'No description',
      isClipped: false,
    }));
}

export async function clipCoupon(sessionData: SessionData, couponId: string): Promise<boolean> {
  const url = `${config.schnucksBaseUrl}/api/coupon-api/v1/clipped`;
  const clientId = getClientId(sessionData);

  try {
    logger.debug('Clipping coupon via fetch', { couponId, url, clientId });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getHeaders(clientId, sessionData),
        'Content-Type': 'text/plain;charset=UTF-8',
        Origin: config.schnucksBaseUrl,
      },
      body: JSON.stringify({ couponId: Number(couponId) }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.warn('Failed to clip coupon', {
        couponId,
        status: response.status,
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
