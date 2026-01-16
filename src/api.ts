import { BrowserContext } from 'playwright';
import { config } from './config.js';
import { logger } from './logger.js';

export interface Coupon {
    id: string; // Internalized as string for consistency
    description: string;
    isClipped: boolean;
    source?: string;
}

/**
 * Extracts the schnucks-client-id from the session's localStorage
 */
async function getClientId(context: BrowserContext): Promise<string> {
    const state = await context.storageState();
    const origin = state.origins.find(o => o.origin === config.schnucksBaseUrl || o.origin.includes('schnucks.com'));
    const clientIdObj = origin?.localStorage.find(item => item.name === 'schnucks-client-id');

    if (!clientIdObj) {
        logger.warn('schnucks-client-id not found in session localStorage. Using fallback.');
        return 'hq36yDS0fiNFTHPby_YWb'; // Fallback to a known working one
    }

    return clientIdObj.value;
}

const getHeaders = (clientId: string) => ({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
    'X-SCHNUCKS-CLIENT-ID': clientId,
    'Accept': '*/*',
    'Referer': `${config.schnucksBaseUrl}/digital-coupons/all`,
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
            throw new Error(`API_ERROR: Failed to fetch coupons. Status: ${status}`);
        }

        const { data } = await response.json();
        return (data || [])
            .filter((c: any) => c.clippedDate === null && c.expired === false)
            .map((c: any) => ({
                id: String(c.id),
                description: c.description || 'No description',
                isClipped: false,
            }));
    } finally {
        await page.close();
    }
}

export async function clipCoupon(context: BrowserContext, couponId: string): Promise<boolean> {
    const page = await context.newPage();
    const url = `${config.schnucksBaseUrl}/api/coupon-api/v1/clipped`;
    const clientId = await getClientId(context);

    try {
        logger.debug('Clipping coupon', { couponId, url, clientId });

        const response = await page.evaluate(async ({ url, method, headers, body }) => {
            const resp = await fetch(url, { method, headers, body });
            return {
                ok: resp.ok,
                status: resp.status,
                text: await resp.text(),
            };
        }, {
            url,
            method: 'POST',
            headers: {
                ...getHeaders(clientId),
                'Origin': config.schnucksBaseUrl,
                'Content-Type': 'text/plain;charset=UTF-8',
            },
            body: JSON.stringify({ couponId: Number(couponId) }),
        });

        if (!response.ok) {
            logger.warn('Failed to clip coupon', {
                couponId,
                status: response.status,
                body: response.text
            });
            return false;
        }

        return true;
    } catch (error) {
        logger.error('Error clipping coupon', {
            couponId,
            error: error instanceof Error ? error.message : String(error)
        });
        return false;
    } finally {
        await page.close();
    }
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        logger.warn('Operation failed, retrying...', { retriesLeft: retries - 1, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2);
    }
}
