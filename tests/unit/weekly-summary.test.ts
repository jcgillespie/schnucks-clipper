import { test, describe } from 'node:test';
import assert from 'node:assert';
import { escapeHtml, formatEmailSummary, type ExecutionResult } from '../../src/weekly-summary.js';

describe('Weekly Summary Email Formatting', () => {
  test('should format empty execution list', () => {
    const { html, text } = formatEmailSummary([]);

    assert.ok(html.includes('No job executions found'));
    assert.ok(text.includes('No job executions found'));
    assert.ok(html.includes('Total Executions:</span> 0'));
    assert.ok(text.includes('Total Executions: 0'));
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

    const { html, text } = formatEmailSummary(executions);

    assert.ok(html.includes('Succeeded'));
    assert.ok(html.includes('test-job-123'));
    assert.ok(html.includes('"total": 5'));
    assert.ok(text.includes('Succeeded'));
    assert.ok(text.includes('test-job-123'));
    assert.ok(text.includes('"total":5'));
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

    const { html, text } = formatEmailSummary(executions);

    assert.ok(html.includes('Failed'));
    assert.ok(html.includes('test-job-456'));
    assert.ok(html.includes('Network timeout'));
    assert.ok(html.includes('Connection refused'));
    assert.ok(text.includes('Failed'));
    assert.ok(text.includes('test-job-456'));
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

    const { html, text } = formatEmailSummary(executions);

    assert.ok(html.includes('Total Executions:</span> 3'));
    assert.ok(html.includes('Succeeded:</span> <span class="status-badge status-succeeded">2'));
    assert.ok(html.includes('Failed:</span> <span class="status-badge status-failed">1'));
    assert.ok(text.includes('Total Executions: 3'));
    assert.ok(text.includes('Succeeded: 2'));
    assert.ok(text.includes('Failed: 1'));
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

    const { html } = formatEmailSummary(executions);

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

    const { html } = formatEmailSummary(executions);

    // Verify that HTML in jobExecution is escaped
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    // Verify JSON summary is present and properly escaped
    assert.ok(html.includes('summary-json'));
    assert.ok(html.includes('"total": 1'));
  });
});
