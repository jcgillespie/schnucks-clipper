import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { clipAllCoupons } from '../../src/clipper.js';
import { SessionData } from '../../src/api.js';

describe('Integration: Coupon Clipping Flow', () => {
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

  test('Full flow with mocks should complete successfully', async () => {
    // Mock fetch for both list and clip endpoints
    global.fetch = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes('/api/coupon-api/v1/coupons')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { id: 'int-1', description: 'Integration 1', clippedDate: null, expired: false },
              { id: 'int-2', description: 'Integration 2', clippedDate: null, expired: false },
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
    assert.ok(summary.total > 0);
  });
});
