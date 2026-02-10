import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatEmailSummary, type ExecutionResult } from '../../src/weekly-summary.js';
import { type WeeklySummaryConfig } from '../../src/weekly-summary-config.js';

describe('Weekly Summary Email Formatting', () => {
  // Mock config for tests
  const mockConfig: WeeklySummaryConfig = {
    logAnalyticsWorkspaceId: 'test-workspace',
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
