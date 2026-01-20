import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import playwright from 'playwright-chromium';
const { chromium } = playwright;
type Browser = import('playwright-chromium').Browser;
type BrowserContext = import('playwright-chromium').BrowserContext;
import { clipAllCoupons } from '../../src/clipper.js';

describe('Clipper Orchestration', () => {
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

  test('clipAllCoupons should process all available coupons', async () => {
    await context.route('**/api/coupon-api/v1/coupons', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: '101', description: 'Coupon 1', clippedDate: null, expired: false },
            { id: '102', description: 'Coupon 2', clippedDate: null, expired: false },
          ],
        }),
      });
    });

    // Mock context.request.post explicitly
    context.request.post = async (url: string) => {
      if (url.includes('/api/coupon-api/v1/clipped')) {
        return {
          ok: () => true,
          status: () => 200,
          text: async () => 'OK',
        } as any;
      }
      throw new Error(`Unexpected POST to ${url}`);
    };

    const summary = await clipAllCoupons(context);

    assert.strictEqual(summary.total, 2);
    assert.strictEqual(summary.clipped, 2);
    assert.strictEqual(summary.failed, 0);

    await context.unroute('**/api/coupon-api/v1/coupons');
  });

  test('clipAllCoupons should handle failures gracefully', async () => {
    await context.route('**/api/coupon-api/v1/coupons', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: [{ id: 'fail', description: 'Fail', clippedDate: null, expired: false }],
        }),
      });
    });

    // Mock context.request.post explicitly for failure
    context.request.post = async (url: string) => {
      if (url.includes('/api/coupon-api/v1/clipped')) {
        return {
          ok: () => false,
          status: () => 500,
          text: async () => 'Internal Server Error',
        } as any;
      }
      throw new Error(`Unexpected POST to ${url}`);
    };

    const summary = await clipAllCoupons(context);

    assert.strictEqual(summary.total, 1);
    assert.strictEqual(summary.clipped, 0);
    assert.strictEqual(summary.failed, 1);

    await context.unroute('**/api/coupon-api/v1/coupons');
  });
});
