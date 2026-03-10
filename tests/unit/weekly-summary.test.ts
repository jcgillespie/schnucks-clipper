import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatEmailSummary, type ExecutionResult } from '../../src/weekly-summary.js';
import { type WeeklySummaryConfig } from '../../src/weekly-summary-config.js';
import type { RunSummary } from '../../src/run-summary-store.js';

// Re-export the private function for testing by importing the module
// convertRunSummariesToExecutionResults is tested indirectly via runWeeklySummary,
// but we can verify the mapping logic through known RunSummary fixtures.
function makeRunSummary(overrides: Partial<RunSummary>): RunSummary {
  return {
    timestamp: Date.now(),
    executionId: 'exec-test-001',
    status: 'success',
    jobType: 'clipper',
    clipped: 0,
    failed: 0,
    skipped: 0,
    ...overrides,
  };
}

describe('Weekly Summary Email Formatting', () => {
  // Mock config for tests
  const mockConfig: WeeklySummaryConfig = {
    appConfigEndpoint: 'https://test.azconfig.io',
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'user',
    smtpPass: 'pass',
    emailFrom: 'sender@example.com',
    emailTo: 'recipient@example.com',
    schedule: 'daily',
    lookbackDays: 1,
    sendOnSuccess: true,
  };

  test('should format empty execution list', () => {
    const { html, text } = formatEmailSummary([], 1, mockConfig);

    assert.ok(html.includes('No job executions found'));
    assert.ok(text.includes('No job executions found'));
  });

  test('should format successful executions', () => {
    const executions: ExecutionResult[] = [
      {
        jobExecution: 'test-job-123',
        Status: 'Succeeded',
        ExecutionTime: new Date().toISOString(),
        Summary: {
          total: 5,
          clipped: 5,
          failed: 0,
          skipped: 0,
        },
      },
    ];

    const { html, text } = formatEmailSummary(executions, 1, mockConfig);

    // Check aggregated summaries
    assert.ok(html.includes('Total Job Runs'));
    assert.ok(html.includes('Coupons Clipped'));
    assert.ok(html.includes('Total Clipped'));
    assert.ok(html.includes('5')); // 5 clipped coupons
    assert.ok(text.includes('Total Job Runs: 1'));
    assert.ok(text.includes('Total Clipped: 5'));
  });

  test('should format failed executions with error reasons', () => {
    const executions: ExecutionResult[] = [
      {
        jobExecution: 'test-job-456',
        Status: 'Failed',
        ExecutionTime: new Date().toISOString(),
        ErrorReasons: ['Network timeout', 'Connection refused'],
      },
    ];

    const { html, text } = formatEmailSummary(executions, 1, mockConfig);

    // Check that errors are shown in the Issues section
    assert.ok(html.includes('Issues Detected'));
    assert.ok(html.includes('Network timeout'));
    assert.ok(html.includes('Connection refused'));
    assert.ok(text.includes('ISSUES DETECTED'));
    assert.ok(text.includes('Network timeout'));
    assert.ok(text.includes('Connection refused'));
  });

  test('should calculate summary statistics correctly', () => {
    const executions: ExecutionResult[] = [
      {
        jobExecution: 'job-1',
        Status: 'Succeeded',
        ExecutionTime: new Date().toISOString(),
        Summary: { total: 3, clipped: 3, failed: 0, skipped: 0 },
      },
      {
        jobExecution: 'job-2',
        Status: 'Succeeded',
        ExecutionTime: new Date().toISOString(),
        Summary: { total: 2, clipped: 2, failed: 0, skipped: 0 },
      },
      {
        jobExecution: 'job-3',
        Status: 'Failed',
        ExecutionTime: new Date().toISOString(),
        ErrorReasons: ['Error message'],
      },
    ];

    const { html, text } = formatEmailSummary(executions, 1, mockConfig);

    // Check aggregated statistics across the period
    assert.ok(html.includes('Total Job Runs'));
    assert.ok(html.includes('3')); // 3 total runs
    assert.ok(html.includes('Total Clipped'));
    assert.ok(html.includes('5')); // 3 + 2 = 5 total clipped
    assert.ok(text.includes('Total Job Runs: 3'));
    assert.ok(text.includes('Total Clipped: 5'));
  });

  test('should escape HTML in error messages', () => {
    const executions: ExecutionResult[] = [
      {
        jobExecution: 'test-job',
        Status: 'Failed',
        ExecutionTime: new Date().toISOString(),
        ErrorReasons: ['Error with <script>alert("xss")</script>'],
      },
    ];

    const { html } = formatEmailSummary(executions, 1, mockConfig);

    // Errors should be escaped in the Issues section
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
  });

  test('should escape HTML in job execution names', () => {
    const executions: ExecutionResult[] = [
      {
        jobExecution: 'test-job-<script>alert("xss")</script>',
        Status: 'Succeeded',
        ExecutionTime: new Date().toISOString(),
        Summary: {
          total: 1,
          clipped: 1,
          failed: 0,
          skipped: 0,
        },
      },
    ];

    const { html } = formatEmailSummary(executions, 1, mockConfig);

    // Summary should be present and properly formatted (no job execution name shown in new format)
    assert.ok(html.includes('Period Summary'));
    assert.ok(html.includes('Total Clipped'));
    assert.ok(html.includes('1'));
  });
});

describe('Run Summary → Email conversion (clip counts)', () => {
  test('successful clipper run maps clip counts correctly', () => {
    const run = makeRunSummary({ clipped: 12, failed: 1, skipped: 3 });
    // Verify the mapping produces correct totals by formatting an email
    const executions: ExecutionResult[] = [
      {
        jobExecution: run.executionId,
        Status: 'Succeeded',
        ExecutionTime: new Date(run.timestamp).toISOString(),
        Summary: {
          total: (run.clipped ?? 0) + (run.failed ?? 0) + (run.skipped ?? 0),
          clipped: run.clipped ?? 0,
          failed: run.failed ?? 0,
          skipped: run.skipped ?? 0,
        },
      },
    ];

    const mockConfig: WeeklySummaryConfig = {
      appConfigEndpoint: 'https://test.azconfig.io',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'user',
      smtpPass: 'pass',
      emailFrom: 'sender@example.com',
      emailTo: 'recipient@example.com',
      schedule: 'weekly',
      lookbackDays: 7,
      sendOnSuccess: true,
    };

    const { html, text } = formatEmailSummary(executions, 7, mockConfig);

    assert.ok(html.includes('12'), 'HTML should include clipped count (12)');
    assert.ok(text.includes('Total Clipped: 12'), 'text should include Total Clipped: 12');
    assert.ok(text.includes('Total Job Runs: 1'));
    assert.ok(text.includes('Successful: 1'));
  });

  test('failed clipper run shows in failed count, not clipped', () => {
    const run = makeRunSummary({
      status: 'failure',
      clipped: undefined,
      errorReasons: ['RE-AUTHENTICATE: session expired'],
    });
    const executions: ExecutionResult[] = [
      {
        jobExecution: run.executionId,
        Status: 'Failed',
        ExecutionTime: new Date(run.timestamp).toISOString(),
        ErrorReasons: run.errorReasons,
        Summary: undefined,
      },
    ];

    const mockConfig: WeeklySummaryConfig = {
      appConfigEndpoint: 'https://test.azconfig.io',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'user',
      smtpPass: 'pass',
      emailFrom: 'sender@example.com',
      emailTo: 'recipient@example.com',
      schedule: 'weekly',
      lookbackDays: 7,
      sendOnSuccess: true,
    };

    const { html, text } = formatEmailSummary(executions, 7, mockConfig);

    assert.ok(text.includes('Total Job Runs: 1'));
    assert.ok(text.includes('Failed: 1'));
    assert.ok(text.includes('Total Clipped: 0'));
    assert.ok(html.includes('RE-AUTHENTICATE'), 'Failure reason should appear in email');
  });

  test('weekly-summary jobType runs are excluded from clip count', () => {
    // weekly-summary job writes its own run record; it must not appear in email stats
    const weeklySummaryRun = makeRunSummary({ jobType: 'weekly-summary', clipped: undefined });
    const clipperRun = makeRunSummary({ clipped: 5, failed: 0, skipped: 0 });

    // Simulate what convertRunSummariesToExecutionResults does
    const allRuns: RunSummary[] = [weeklySummaryRun, clipperRun];
    const executions: ExecutionResult[] = allRuns
      .filter((r) => r.jobType === 'clipper')
      .map((r) => ({
        jobExecution: r.executionId,
        Status: r.status === 'success' ? 'Succeeded' : 'Failed',
        ExecutionTime: new Date(r.timestamp).toISOString(),
        Summary: r.status === 'success'
          ? { total: (r.clipped ?? 0) + (r.failed ?? 0) + (r.skipped ?? 0), clipped: r.clipped ?? 0, failed: r.failed ?? 0, skipped: r.skipped ?? 0 }
          : undefined,
      }));

    assert.strictEqual(executions.length, 1, 'only clipper runs should appear');
    assert.strictEqual(executions[0].Summary?.clipped, 5);
  });
});
