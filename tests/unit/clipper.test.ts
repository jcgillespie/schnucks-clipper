import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { chromium, Browser, BrowserContext } from 'playwright';
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
                        localStorage: [
                            { name: 'schnucks-client-id', value: 'test-client-id' }
                        ]
                    }
                ]
            }
        });
    });

    after(async () => {
        await context.close();
        await browser.close();
    });

    test('clipAllCoupons should process all available coupons', async () => {
        await context.route('**/api/coupon-api/v1/coupons', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: [
                        { id: '101', description: 'Coupon 1', clippedDate: null, expired: false },
                        { id: '102', description: 'Coupon 2', clippedDate: null, expired: false }
                    ]
                })
            });
        });

        await context.route('**/api/coupon-api/v1/clipped', route => {
            route.fulfill({ status: 200 });
        });

        const summary = await clipAllCoupons(context);

        assert.strictEqual(summary.total, 2);
        assert.strictEqual(summary.clipped, 2);
        assert.strictEqual(summary.failed, 0);

        await context.unroute('**/api/coupon-api/v1/coupons');
        await context.unroute('**/api/coupon-api/v1/clipped');
    });

    test('clipAllCoupons should handle failures gracefully', async () => {
        await context.route('**/api/coupon-api/v1/coupons', route => {
            route.fulfill({
                status: 200,
                body: JSON.stringify({ data: [{ id: 'fail', description: 'Fail', clippedDate: null, expired: false }] })
            });
        });

        await context.route('**/api/coupon-api/v1/clipped', route => {
            route.fulfill({ status: 500 });
        });

        const summary = await clipAllCoupons(context);

        assert.strictEqual(summary.total, 1);
        assert.strictEqual(summary.clipped, 0);
        assert.strictEqual(summary.failed, 1);

        await context.unroute('**/api/coupon-api/v1/coupons');
        await context.unroute('**/api/coupon-api/v1/clipped');
    });
});
