import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

describe('Weekly Summary Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should throw error when LOG_ANALYTICS_WORKSPACE_ID is missing', () => {
    delete process.env.LOG_ANALYTICS_WORKSPACE_ID;
    process.env.SMTP_HOST = 'smtp.mailgun.org';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'password';
    process.env.EMAIL_FROM = 'from@example.com';
    process.env.EMAIL_TO = 'to@example.com';

    // Clear module cache to force re-import with new env vars
    const modulePath = require.resolve('../../src/weekly-summary-config.js');
    delete require.cache[modulePath];

    const { getWeeklySummaryConfig } = require('../../src/weekly-summary-config.js');
    assert.throws(() => {
      getWeeklySummaryConfig();
    }, /MISSING_CONFIG: LOG_ANALYTICS_WORKSPACE_ID/);
  });

  test('should throw error when SMTP_HOST is missing', () => {
    process.env.LOG_ANALYTICS_WORKSPACE_ID = 'workspace-id';
    delete process.env.SMTP_HOST;
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'password';
    process.env.EMAIL_FROM = 'from@example.com';
    process.env.EMAIL_TO = 'to@example.com';

    const modulePath = require.resolve('../../src/weekly-summary-config.js');
    delete require.cache[modulePath];

    const { getWeeklySummaryConfig } = require('../../src/weekly-summary-config.js');
    assert.throws(() => {
      getWeeklySummaryConfig();
    }, /MISSING_CONFIG: SMTP_HOST/);
  });

  test('should use default SMTP_PORT of 587', () => {
    process.env.LOG_ANALYTICS_WORKSPACE_ID = 'workspace-id';
    process.env.SMTP_HOST = 'smtp.mailgun.org';
    delete process.env.SMTP_PORT;
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'password';
    process.env.EMAIL_FROM = 'from@example.com';
    process.env.EMAIL_TO = 'to@example.com';

    const modulePath = require.resolve('../../src/weekly-summary-config.js');
    delete require.cache[modulePath];

    const { getWeeklySummaryConfig } = require('../../src/weekly-summary-config.js');
    const config = getWeeklySummaryConfig();
    assert.strictEqual(config.smtpPort, 587);
  });

  test('should validate SMTP_PORT is a valid number', () => {
    process.env.LOG_ANALYTICS_WORKSPACE_ID = 'workspace-id';
    process.env.SMTP_HOST = 'smtp.mailgun.org';
    process.env.SMTP_PORT = 'invalid';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'password';
    process.env.EMAIL_FROM = 'from@example.com';
    process.env.EMAIL_TO = 'to@example.com';

    const modulePath = require.resolve('../../src/weekly-summary-config.js');
    delete require.cache[modulePath];

    const { getWeeklySummaryConfig } = require('../../src/weekly-summary-config.js');
    assert.throws(() => {
      getWeeklySummaryConfig();
    }, /INVALID_CONFIG: SMTP_PORT/);
  });

  test('should load all required configuration', () => {
    process.env.LOG_ANALYTICS_WORKSPACE_ID = 'workspace-123';
    process.env.SMTP_HOST = 'smtp.mailgun.org';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'secret-password';
    process.env.EMAIL_FROM = 'from@example.com';
    process.env.EMAIL_TO = 'to@example.com';
    process.env.JOB_NAME = 'test-job';

    const modulePath = require.resolve('../../src/weekly-summary-config.js');
    delete require.cache[modulePath];

    const { getWeeklySummaryConfig } = require('../../src/weekly-summary-config.js');
    const config = getWeeklySummaryConfig();

    assert.strictEqual(config.logAnalyticsWorkspaceId, 'workspace-123');
    assert.strictEqual(config.smtpHost, 'smtp.mailgun.org');
    assert.strictEqual(config.smtpPort, 587);
    assert.strictEqual(config.smtpUser, 'user@example.com');
    assert.strictEqual(config.smtpPass, 'secret-password');
    assert.strictEqual(config.emailFrom, 'from@example.com');
    assert.strictEqual(config.emailTo, 'to@example.com');
    assert.strictEqual(config.jobName, 'test-job');
  });
});
