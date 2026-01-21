import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { getCoupons, clipCoupon, withRetry, SessionData } from '../../src/api.js';

describe('API Client', () => {
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

  test('getCoupons should parse API response correctly', async () => {
    // Mock fetch for getCoupons
    global.fetch = mock.fn(async (input: RequestInfo | URL) => {
      if (input.toString().includes('/api/coupon-api/v1/coupons')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            codes: ['0'],
            messages: ['success'],
            data: [
              { id: 123, description: 'Test Coupon 1', clippedDate: null, expired: false },
              { id: 456, description: 'Test Coupon 2', clippedDate: '2024-01-01', expired: false }, // Already clipped
              { id: 789, description: 'Test Coupon 3', clippedDate: null, expired: true }, // Expired
            ],
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch to ${input}`);
    });

    const coupons = await getCoupons(sessionData);
    assert.strictEqual(coupons.length, 1);
    assert.strictEqual(coupons[0].id, '123');
  });

  test('getCoupons should throw auth failure on 401/403', async () => {
    const statuses = [401, 403];

    for (const status of statuses) {
      global.fetch = mock.fn(async (input: RequestInfo | URL) => {
        if (input.toString().includes('/api/coupon-api/v1/coupons')) {
          return {
            ok: false,
            status,
            json: async () => ({ data: null }),
          } as Response;
        }
        throw new Error(`Unexpected fetch to ${input}`);
      });

      await assert.rejects(() => getCoupons(sessionData), /AUTH_FAILED/);
    }
  });

  test('clipCoupon should return true on success', async () => {
    // Mock fetch for clipCoupon
    global.fetch = mock.fn(async (input: RequestInfo | URL) => {
      if (input.toString().includes('/api/coupon-api/v1/clipped')) {
        return {
          ok: true,
          status: 200,
          text: async () => 'OK',
        } as Response;
      }
      throw new Error(`Unexpected POST to ${input}`);
    });

    const success = await clipCoupon(sessionData, '123');
    assert.strictEqual(success, true);
  });

  test('clipCoupon should return false on non-OK response', async () => {
    global.fetch = mock.fn(async (input: RequestInfo | URL) => {
      if (input.toString().includes('/api/coupon-api/v1/clipped')) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response;
      }
      throw new Error(`Unexpected POST to ${input}`);
    });

    const success = await clipCoupon(sessionData, '123');
    assert.strictEqual(success, false);
  });

  test('clipCoupon should return false on fetch error', async () => {
    global.fetch = mock.fn(async (input: RequestInfo | URL) => {
      if (input.toString().includes('/api/coupon-api/v1/clipped')) {
        throw new Error('Network error');
      }
      throw new Error(`Unexpected POST to ${input}`);
    });

    const success = await clipCoupon(sessionData, '123');
    assert.strictEqual(success, false);
  });

  test('withRetry should retry and succeed', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'ok';
      },
      3,
      0,
    );

    assert.strictEqual(result, 'ok');
    assert.strictEqual(attempts, 3);
  });

  test('withRetry should throw after retries exhausted', async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        withRetry(
          async () => {
            attempts += 1;
            throw new Error('Always fails');
          },
          2,
          0,
        ),
      /Always fails/,
    );
    assert.strictEqual(attempts, 3);
  });
});
