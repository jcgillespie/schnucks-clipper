import { test, describe } from 'node:test';
import assert from 'node:assert';
import type { IRunSummaryStore, RunSummary } from '../../src/run-summary-store.js';

// In-memory implementation for testing the interface contract
class InMemoryRunSummaryStore implements IRunSummaryStore {
  private runs: RunSummary[] = [];

  async writeRun(summary: RunSummary): Promise<void> {
    this.runs.push(summary);
  }

  async listRuns(sinceDateEpochMs: number): Promise<RunSummary[]> {
    return this.runs
      .filter((r) => r.timestamp >= sinceDateEpochMs)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async listRunsSince(lookbackDays: number): Promise<RunSummary[]> {
    const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
    return this.listRuns(since);
  }
}

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

describe('IRunSummaryStore contract (in-memory)', () => {
  test('writeRun and listRuns returns written record', async () => {
    const store = new InMemoryRunSummaryStore();
    const run = makeRun({ clipped: 10, failed: 2, skipped: 0 });
    await store.writeRun(run);

    const results = await store.listRuns(0);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].executionId, run.executionId);
    assert.strictEqual(results[0].clipped, 10);
    assert.strictEqual(results[0].failed, 2);
    assert.strictEqual(results[0].skipped, 0);
  });

  test('listRuns filters by sinceDateEpochMs', async () => {
    const store = new InMemoryRunSummaryStore();
    const old = makeRun({ timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000 }); // 10 days ago
    const recent = makeRun({ timestamp: Date.now() - 1 * 60 * 60 * 1000 }); // 1 hour ago
    await store.writeRun(old);
    await store.writeRun(recent);

    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    const results = await store.listRuns(cutoff);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].executionId, recent.executionId);
  });

  test('listRunsSince(7) returns runs within last 7 days', async () => {
    const store = new InMemoryRunSummaryStore();
    const withinWindow = makeRun({ timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 }); // 3 days ago
    const outsideWindow = makeRun({ timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000 }); // 8 days ago
    await store.writeRun(withinWindow);
    await store.writeRun(outsideWindow);

    const results = await store.listRunsSince(7);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].executionId, withinWindow.executionId);
  });

  test('listRuns returns runs sorted descending by timestamp', async () => {
    const store = new InMemoryRunSummaryStore();
    const first = makeRun({ timestamp: Date.now() - 3000 });
    const second = makeRun({ timestamp: Date.now() - 2000 });
    const third = makeRun({ timestamp: Date.now() - 1000 });
    await store.writeRun(first);
    await store.writeRun(second);
    await store.writeRun(third);

    const results = await store.listRuns(0);
    assert.strictEqual(results[0].executionId, third.executionId);
    assert.strictEqual(results[1].executionId, second.executionId);
    assert.strictEqual(results[2].executionId, first.executionId);
  });

  test('failure run stores errorReasons', async () => {
    const store = new InMemoryRunSummaryStore();
    const run = makeRun({
      status: 'failure',
      clipped: undefined,
      failed: undefined,
      skipped: undefined,
      errorReasons: ['RE-AUTHENTICATE: session expired'],
      errorMessage: 'Session cookie has expired',
    });
    await store.writeRun(run);

    const results = await store.listRuns(0);
    assert.strictEqual(results[0].status, 'failure');
    assert.deepStrictEqual(results[0].errorReasons, ['RE-AUTHENTICATE: session expired']);
    assert.strictEqual(results[0].errorMessage, 'Session cookie has expired');
    assert.strictEqual(results[0].clipped, undefined);
  });

  test('weekly-summary jobType can be stored alongside clipper runs', async () => {
    const store = new InMemoryRunSummaryStore();
    await store.writeRun(makeRun({ jobType: 'clipper', clipped: 7 }));
    await store.writeRun(makeRun({ jobType: 'weekly-summary', clipped: undefined }));

    const all = await store.listRuns(0);
    assert.strictEqual(all.length, 2);

    const clipperRuns = all.filter((r) => r.jobType === 'clipper');
    const summaryRuns = all.filter((r) => r.jobType === 'weekly-summary');
    assert.strictEqual(clipperRuns.length, 1);
    assert.strictEqual(clipperRuns[0].clipped, 7);
    assert.strictEqual(summaryRuns.length, 1);
  });

  test('listRuns returns empty array when store is empty', async () => {
    const store = new InMemoryRunSummaryStore();
    const results = await store.listRuns(0);
    assert.deepStrictEqual(results, []);
  });

  test('listRunsSince(7) returns empty array when no runs in window', async () => {
    const store = new InMemoryRunSummaryStore();
    // Only old run, outside the 7-day window
    await store.writeRun(makeRun({ timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000 }));
    const results = await store.listRunsSince(7);
    assert.deepStrictEqual(results, []);
  });
});
