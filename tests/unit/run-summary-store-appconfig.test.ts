import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import type { AppConfigurationClient, ConfigurationSetting } from '@azure/app-configuration';
import { AppConfigRunSummaryStore } from '../../src/run-summary-store-appconfig.js';
import type { RunSummary } from '../../src/run-summary-store.js';

function makeRun(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    timestamp: Date.now(),
    executionId: `exec-${Math.random().toString(36).slice(2, 9)}`,
    status: 'success',
    jobType: 'clipper',
    clipped: 5,
    failed: 0,
    skipped: 1,
    ...overrides,
  };
}

function makeFakeClient(overrides: Partial<AppConfigurationClient> = {}): AppConfigurationClient {
  return {
    setConfigurationSetting: mock.fn(async () => ({}) as ConfigurationSetting<string>),
    listConfigurationSettings: mock.fn(async function* () {}),
    ...overrides,
  } as unknown as AppConfigurationClient;
}

function storeWith(client: AppConfigurationClient): AppConfigRunSummaryStore {
  return new AppConfigRunSummaryStore('https://fake.azconfig.io', undefined, client);
}

describe('AppConfigRunSummaryStore', () => {
  describe('writeRun', () => {
    test('calls setConfigurationSetting with correct key format', async () => {
      const client = makeFakeClient();
      const store = storeWith(client);
      const run = makeRun({ timestamp: 1000, executionId: 'abc123' });

      await store.writeRun(run);

      const calls = (client.setConfigurationSetting as ReturnType<typeof mock.fn>).mock.calls;
      assert.strictEqual(calls.length, 1);
      const arg = calls[0].arguments[0];
      assert.strictEqual(arg.key, 'run:1000:abc123');
    });

    test('sets label and contentType', async () => {
      const client = makeFakeClient();
      const store = storeWith(client);

      await store.writeRun(makeRun());

      const arg = (client.setConfigurationSetting as ReturnType<typeof mock.fn>).mock.calls[0]
        .arguments[0];
      assert.strictEqual(arg.label, 'run');
      assert.strictEqual(arg.contentType, 'application/json');
    });

    test('serializes the full run summary as JSON', async () => {
      const client = makeFakeClient();
      const store = storeWith(client);
      const run = makeRun({ clipped: 7, failed: 1, skipped: 2 });

      await store.writeRun(run);

      const arg = (client.setConfigurationSetting as ReturnType<typeof mock.fn>).mock.calls[0]
        .arguments[0];
      const parsed = JSON.parse(arg.value);
      assert.strictEqual(parsed.clipped, 7);
      assert.strictEqual(parsed.failed, 1);
      assert.strictEqual(parsed.executionId, run.executionId);
    });

    test('throws when setConfigurationSetting rejects', async () => {
      const client = makeFakeClient({
        setConfigurationSetting: mock.fn(async () => {
          throw new Error('network error');
        }),
      });
      const store = storeWith(client);

      await assert.rejects(() => store.writeRun(makeRun()), /network error/);
    });
  });

  describe('listRuns', () => {
    test('passes keyFilter and labelFilter to listConfigurationSettings', async () => {
      const client = makeFakeClient();
      const store = storeWith(client);

      await store.listRuns(0);

      const calls = (client.listConfigurationSettings as ReturnType<typeof mock.fn>).mock.calls;
      assert.strictEqual(calls.length, 1);
      const options = calls[0].arguments[0];
      assert.strictEqual(options.keyFilter, 'run:*');
      assert.strictEqual(options.labelFilter, 'run');
    });

    test('filters out entries older than sinceDateEpochMs', async () => {
      const old = makeRun({ timestamp: 1000 });
      const recent = makeRun({ timestamp: 9000 });
      const client = makeFakeClient({
        listConfigurationSettings: mock.fn(async function* () {
          yield { key: `run:1000:x`, value: JSON.stringify(old), label: 'run' };
          yield { key: `run:9000:y`, value: JSON.stringify(recent), label: 'run' };
        }),
      });
      const store = storeWith(client);

      const results = await store.listRuns(5000);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].executionId, recent.executionId);
    });

    test('returns results sorted descending by timestamp', async () => {
      const runs = [
        makeRun({ timestamp: 1000 }),
        makeRun({ timestamp: 3000 }),
        makeRun({ timestamp: 2000 }),
      ];
      const client = makeFakeClient({
        listConfigurationSettings: mock.fn(async function* () {
          for (const r of runs) {
            yield { key: `run:${r.timestamp}:x`, value: JSON.stringify(r), label: 'run' };
          }
        }),
      });
      const store = storeWith(client);

      const results = await store.listRuns(0);
      assert.strictEqual(results[0].timestamp, 3000);
      assert.strictEqual(results[1].timestamp, 2000);
      assert.strictEqual(results[2].timestamp, 1000);
    });

    test('skips entries with missing value without throwing', async () => {
      const run = makeRun();
      const client = makeFakeClient({
        listConfigurationSettings: mock.fn(async function* () {
          yield { key: 'run:1:a', value: undefined, label: 'run' };
          yield { key: `run:${run.timestamp}:b`, value: JSON.stringify(run), label: 'run' };
        }),
      });
      const store = storeWith(client);

      const results = await store.listRuns(0);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].executionId, run.executionId);
    });

    test('skips corrupt JSON entries without throwing', async () => {
      const run = makeRun();
      const client = makeFakeClient({
        listConfigurationSettings: mock.fn(async function* () {
          yield { key: 'run:1:corrupt', value: '{not valid json', label: 'run' };
          yield { key: `run:${run.timestamp}:good`, value: JSON.stringify(run), label: 'run' };
        }),
      });
      const store = storeWith(client);

      const results = await store.listRuns(0);
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].executionId, run.executionId);
    });

    test('throws when listConfigurationSettings rejects', async () => {
      const client = makeFakeClient({
        listConfigurationSettings: mock.fn(() => ({
          [Symbol.asyncIterator]() {
            return {
              next() {
                return Promise.reject(new Error('upstream failure'));
              },
            };
          },
        })),
      });
      const store = storeWith(client);

      await assert.rejects(() => store.listRuns(0), /upstream failure/);
    });

    test('returns empty array when no runs match the time window', async () => {
      const client = makeFakeClient({
        listConfigurationSettings: mock.fn(async function* () {
          yield {
            key: 'run:100:a',
            value: JSON.stringify(makeRun({ timestamp: 100 })),
            label: 'run',
          };
        }),
      });
      const store = storeWith(client);

      const results = await store.listRuns(9999);
      assert.deepStrictEqual(results, []);
    });
  });

  describe('listRunsSince', () => {
    test('delegates to listRuns with a timestamp derived from lookbackDays', async () => {
      const calls: number[] = [];
      const client = makeFakeClient({
        listConfigurationSettings: mock.fn(async function* () {
          // capture what sinceDateEpochMs was used by checking what the store filters
        }),
      });
      // Wrap listRuns to capture the argument
      const store = storeWith(client);
      const original = store.listRuns.bind(store);
      store.listRuns = async (since: number) => {
        calls.push(since);
        return original(since);
      };

      const before = Date.now() - 7 * 24 * 60 * 60 * 1000;
      await store.listRunsSince(7);
      const after = Date.now() - 7 * 24 * 60 * 60 * 1000;

      assert.strictEqual(calls.length, 1);
      assert.ok(calls[0] >= before && calls[0] <= after, 'since should be ~7 days ago');
    });
  });
});
