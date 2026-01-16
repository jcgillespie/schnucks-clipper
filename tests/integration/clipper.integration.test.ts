import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import playwright from 'playwright-chromium';
const { chromium } = playwright;
type Browser = import('playwright-chromium').Browser;
import { clipAllCoupons } from '../../src/clipper.js';

describe('Integration: Coupon Clipping Flow', () => {
  let browser: Browser;

  before(async () => {
    browser = await chromium.launch();
  });

  after(async () => {
    if (browser) await browser.close();
  });

  test('Full flow with mocks should complete successfully', async () => {
    const context = await browser.newContext({
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

    await context.route('**/api/coupon-api/v1/coupons', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: [
            { id: 'int-1', description: 'Integration 1', clippedDate: null, expired: false },
            { id: 'int-2', description: 'Integration 2', clippedDate: null, expired: false },
          ],
        }),
      });
    });

    await context.route('**/api/coupon-api/v1/clipped', (route) => {
      route.fulfill({ status: 200 });
    });

    const summary = await clipAllCoupons(context);

    assert.strictEqual(summary.total, 2);
    assert.strictEqual(summary.clipped, 2);
    assert.ok(summary.total > 0);

    await context.close();
  });
});
