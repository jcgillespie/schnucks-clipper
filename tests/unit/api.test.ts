import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import playwright from 'playwright-chromium';
const { chromium } = playwright;
type Browser = import('playwright-chromium').Browser;
type BrowserContext = import('playwright-chromium').BrowserContext;
import { getCoupons, clipCoupon } from '../../src/api.js';

describe('API Client', () => {
  let browser: Browser;
  let context: BrowserContext;

  before(async () => {
    browser = await chromium.launch();
    context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: 'https://schnucks.com',
            localStorage: [{ name: 'schnucks-client-id', value: 'test-client-id' }],
          },
        ],
      },
    });
  });

  after(async () => {
    await context.close();
    await browser.close();
  });

  test('getCoupons should parse API response correctly', async () => {
    await context.route('**/api/coupon-api/v1/coupons', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          codes: ['0'],
          messages: ['success'],
          data: [
            { id: 123, description: 'Test Coupon 1', clippedDate: null, expired: false },
            { id: 456, description: 'Test Coupon 2', clippedDate: '2024-01-01', expired: false }, // Already clipped
            { id: 789, description: 'Test Coupon 3', clippedDate: null, expired: true }, // Expired
          ],
        }),
      });
    });

    const coupons = await getCoupons(context);
    assert.strictEqual(coupons.length, 1);
    assert.strictEqual(coupons[0].id, '123');
    await context.unroute('**/api/coupon-api/v1/coupons');
  });

  test('clipCoupon should return true on success', async () => {
    await context.route('**/api/coupon-api/v1/clipped', (route) => {
      route.fulfill({ status: 200 });
    });

    const success = await clipCoupon(context, '123');
    assert.strictEqual(success, true);
    await context.unroute('**/api/coupon-api/v1/clipped');
  });
});
