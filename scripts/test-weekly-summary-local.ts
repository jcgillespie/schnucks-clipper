#!/usr/bin/env tsx
/**
 * Local testing script for weekly summary
 *
 * This script allows testing the weekly summary functionality locally without deploying to Azure.
 *
 * Usage:
 *   # Test with mock data (no Azure connection needed)
 *   npm run test:weekly-summary -- --mock
 *
 *   # Test with real Azure Log Analytics (requires az login)
 *   npm run test:weekly-summary -- --workspace-id <your-workspace-id>
 *
 *   # Test email sending with Mailtrap (captures emails for inspection)
 *   npm run test:weekly-summary -- --mock --mailtrap
 */

import { DefaultAzureCredential } from '@azure/identity';
import { LogsQueryClient, LogsQueryResultStatus } from '@azure/monitor-query-logs';
import nodemailer from 'nodemailer';
import { logger } from '../src/logger.js';

interface ExecutionResult {
  jobExecution: string;
  Status: string;
  ExecutionTime: string;
  ErrorReasons?: string[];
  Summary?: {
    total: number;
    clipped: number;
    failed: number;
    skipped: number;
  };
}

// Mock execution data for testing
const MOCK_EXECUTIONS: ExecutionResult[] = [
  {
    jobExecution: 'schnucks-clipper-prod-job-abc123',
    Status: 'Succeeded',
    ExecutionTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    Summary: {
      total: 10,
      clipped: 10,
      failed: 0,
      skipped: 0,
    },
  },
  {
    jobExecution: 'schnucks-clipper-prod-job-def456',
    Status: 'Succeeded',
    ExecutionTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    Summary: {
      total: 5,
      clipped: 5,
      failed: 0,
      skipped: 0,
    },
  },
  {
    jobExecution: 'schnucks-clipper-prod-job-ghi789',
    Status: 'Failed',
    ExecutionTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    ErrorReasons: ['Network timeout', 'Connection refused'],
  },
];

function formatEmailSummary(executions: ExecutionResult[]): { html: string; text: string } {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${sevenDaysAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;

  const total = executions.length;
  const succeeded = executions.filter((e) => e.Status === 'Succeeded').length;
  const failed = executions.filter((e) => e.Status === 'Failed').length;

  // HTML version (simplified for testing)
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Schnucks Clipper - Weekly Summary</title>
</head>
<body>
  <h1>Schnucks Clipper - Weekly Summary</h1>
  <p><strong>Date Range:</strong> ${dateRange}</p>
  <p>Total: ${total}, Succeeded: ${succeeded}, Failed: ${failed}</p>
  <pre>${JSON.stringify(executions, null, 2)}</pre>
</body>
</html>
`;

  const text = `Schnucks Clipper - Weekly Summary\nDate Range: ${dateRange}\n\nTotal: ${total}, Succeeded: ${succeeded}, Failed: ${failed}\n\n${JSON.stringify(executions, null, 2)}`;

  return { html, text };
}

async function testWithMockData() {
  logger.info('Testing with mock data...');
  const executions = MOCK_EXECUTIONS;
  const { html, text } = formatEmailSummary(executions);

  logger.info('Email formatted successfully', {
    executionCount: executions.length,
    htmlLength: html.length,
    textLength: text.length,
  });

  console.log('\n=== HTML Email Preview ===');
  console.log(html.substring(0, 500) + '...\n');

  console.log('\n=== Text Email Preview ===');
  console.log(text.substring(0, 500) + '...\n');

  return { executions, html, text };
}

async function testWithRealAzure(workspaceId: string) {
  logger.info('Testing with real Azure Log Analytics...');
  logger.info('Authenticating to Azure...');

  const credential = new DefaultAzureCredential();
  const client = new LogsQueryClient(credential);

  const query = `
let allLogs =
  ContainerAppConsoleLogs_CL
  | where TimeGenerated > ago(7d)
  | extend jobExecution = extract(@"^(.+)-[^-]+$", 1, ContainerGroupName_s)
  | extend parsedLog = parse_json(Log_s);
let failures =
  allLogs
  | where tostring(parsedLog.level) == "ERROR"
  | extend errorMessage = tostring(parsedLog.error)
  | summarize 
      FailureTime = max(TimeGenerated),
      ErrorReasons = make_set(errorMessage, 10)
    by jobExecution;
let successes =
  allLogs
  | where tostring(parsedLog.message) == "Job completed successfully."
  | extend summary = parsedLog.summary
  | summarize 
      SuccessTime = max(TimeGenerated),
      Summary = any(summary)
    by jobExecution;
failures
| join kind=fullouter successes on jobExecution
| extend 
    ExecutionTime = coalesce(FailureTime, SuccessTime),
    Status = case(
      isnotempty(SuccessTime), "Succeeded",
      isnotempty(FailureTime), "Failed",
      "Unknown"
    )
| project 
    jobExecution,
    Status,
    ExecutionTime,
    ErrorReasons,
    Summary
| order by ExecutionTime desc
`;

  logger.info('Executing KQL query...', { workspaceId });
  const result = await client.queryWorkspace(workspaceId, query, {
    duration: 'P7D',
  });

  if (result.status === LogsQueryResultStatus.Success) {
    logger.info('Query executed successfully', {
      tables: result.tables.length,
      rows: result.tables.reduce((sum, table) => sum + table.rows.length, 0),
    });

    const executions: ExecutionResult[] = [];
    if (result.tables.length > 0 && result.tables[0].rows.length > 0) {
      const table = result.tables[0];
      for (const row of table.rows) {
        const execution: ExecutionResult = {
          jobExecution: String(row[0] || ''),
          Status: String(row[1] || ''),
          ExecutionTime: String(row[2] || ''),
        };

        if (row[3] !== null && row[3] !== undefined) {
          try {
            execution.ErrorReasons = JSON.parse(String(row[3])) as string[];
          } catch {
            execution.ErrorReasons = [String(row[3])];
          }
        }

        if (row[4] !== null && row[4] !== undefined) {
          try {
            // The Azure SDK may return the object directly or as a JSON string
            if (typeof row[4] === 'object') {
              execution.Summary = row[4] as ExecutionResult['Summary'];
            } else {
              execution.Summary = JSON.parse(String(row[4])) as ExecutionResult['Summary'];
            }
          } catch {
            logger.warn('Failed to parse summary', { summary: row[4] });
          }
        }

        executions.push(execution);
      }
    }

    const { html, text } = formatEmailSummary(executions);
    return { executions, html, text };
  } else {
    throw new Error(`Query failed: ${result.partialError?.message || 'Unknown error'}`);
  }
}

async function testEmailSending(html: string, text: string, useMailtrap = false) {
  logger.info('Testing email sending...', { useMailtrap });

  let transporter;
  if (useMailtrap) {
    // Mailtrap test SMTP (free, captures emails for inspection)
    // Sign up at https://mailtrap.io to get credentials
    const mailtrapUser = process.env.MAILTRAP_USER || 'your-mailtrap-user';
    const mailtrapPass = process.env.MAILTRAP_PASS || 'your-mailtrap-pass';

    transporter = nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: mailtrapUser,
        pass: mailtrapPass,
      },
    });

    logger.info('Using Mailtrap test SMTP (emails will be captured, not sent)');
  } else {
    // Use actual SMTP from environment
    const smtpHost = process.env.SMTP_HOST || 'smtp.mailgun.org';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      logger.warn('SMTP credentials not found. Skipping email send test.');
      logger.info('Set SMTP_USER and SMTP_PASS environment variables to test email sending.');
      return;
    }

    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    logger.info('Using configured SMTP server', { host: smtpHost, port: smtpPort });
  }

  const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || 'test@example.com';
  const emailTo = process.env.EMAIL_TO || emailFrom;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${sevenDaysAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;

  logger.info('Sending test email...', { from: emailFrom, to: emailTo });

  const info = await transporter.sendMail({
    from: emailFrom,
    to: emailTo,
    subject: `[TEST] Schnucks Clipper - Weekly Summary (${dateRange})`,
    html,
    text,
  });

  logger.info('Email sent successfully', {
    messageId: info.messageId,
    response: info.response,
  });

  if (useMailtrap) {
    logger.info('Check your Mailtrap inbox to view the email: https://mailtrap.io/inboxes');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const useMock = args.includes('--mock');
  const useMailtrap = args.includes('--mailtrap');
  const workspaceIdIndex = args.indexOf('--workspace-id');
  const workspaceId = workspaceIdIndex >= 0 ? args[workspaceIdIndex + 1] : undefined;

  try {
    let result;

    if (useMock) {
      result = await testWithMockData();
    } else if (workspaceId) {
      result = await testWithRealAzure(workspaceId);
    } else {
      console.error('Usage:');
      console.error('  --mock                    Use mock data (no Azure connection)');
      console.error('  --workspace-id <id>        Use real Azure Log Analytics');
      console.error('  --mailtrap                Use Mailtrap for email testing');
      console.error('');
      console.error('Examples:');
      console.error('  npm run test:weekly-summary -- --mock');
      console.error('  npm run test:weekly-summary -- --mock --mailtrap');
      console.error('  npm run test:weekly-summary -- --workspace-id <your-workspace-id>');
      process.exit(1);
    }

    // Optionally test email sending
    if (args.includes('--send-email') || useMailtrap) {
      await testEmailSending(result.html, result.text, useMailtrap);
    } else {
      logger.info(
        'Skipping email send test. Use --send-email or --mailtrap to test email sending.',
      );
    }

    logger.info('Test completed successfully');
  } catch (error) {
    logger.error('Test failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();
