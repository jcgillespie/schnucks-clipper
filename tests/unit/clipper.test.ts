import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { clipAllCoupons } from '../../src/clipper.js';
import { SessionData } from '../../src/api.js';

describe('Clipper Orchestration', () => {
  const sessionData: SessionData = {
    cookies: [],
    clientId: 'test-client-id',
  };

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('clipAllCoupons should process all available coupons', async () => {
    // Mock fetch
    global.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/api/coupon-api/v1/coupons')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { id: '101', description: 'Coupon 1', clippedDate: null, expired: false },
              { id: '102', description: 'Coupon 2', clippedDate: null, expired: false },
            ],
          }),
        } as Response;
      }
      if (url.includes('/api/coupon-api/v1/clipped')) {
        return {
          ok: true,
          status: 200,
          text: async () => 'OK',
        } as Response;
      }
      throw new Error(`Unexpected request to ${url}`);
    });

    const summary = await clipAllCoupons(sessionData);

    assert.strictEqual(summary.total, 2);
    assert.strictEqual(summary.clipped, 2);
    assert.strictEqual(summary.failed, 0);
  });

  test('clipAllCoupons should handle failures gracefully', async () => {
    // Mock fetch with failures
    global.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/api/coupon-api/v1/coupons')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ id: 'fail', description: 'Fail', clippedDate: null, expired: false }],
          }),
        } as Response;
      }

      if (url.includes('/api/coupon-api/v1/clipped')) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response;
      }
      throw new Error(`Unexpected request to ${url}`);
    });

    const summary = await clipAllCoupons(sessionData);

    assert.strictEqual(summary.total, 1);
    assert.strictEqual(summary.clipped, 0);
    assert.strictEqual(summary.failed, 1);
  });
});
