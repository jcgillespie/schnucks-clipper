import { DefaultAzureCredential } from '@azure/identity';
import { LogsQueryClient, LogsQueryResultStatus } from '@azure/monitor-query-logs';
import nodemailer from 'nodemailer';
import { logger } from './logger.js';
import { getWeeklySummaryConfig, type WeeklySummaryConfig } from './weekly-summary-config.js';

// KQL query from weekly_job_summary alert (infra/modules/observability/main.tf)
const WEEKLY_SUMMARY_QUERY = `
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

export interface ExecutionResult {
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

async function queryLogAnalytics(workspaceId: string, query: string): Promise<ExecutionResult[]> {
  logger.info('Authenticating to Azure...');
  const credential = new DefaultAzureCredential();

  logger.info('Creating LogsQueryClient...');
  const client = new LogsQueryClient(credential);

  logger.info('Executing KQL query...', { workspaceId });
  const result = await client.queryWorkspace(workspaceId, query, {
    duration: 'P7D',
  });

  if (result.status === LogsQueryResultStatus.Success) {
    logger.info('Query executed successfully', {
      tables: result.tables.length,
      rows: result.tables.reduce((sum, table) => sum + table.rows.length, 0),
    });

    if (result.tables.length === 0 || result.tables[0].rows.length === 0) {
      logger.info('No execution results found in the past 7 days');
      return [];
    }

    const table = result.tables[0];
    const executions: ExecutionResult[] = [];

    for (const row of table.rows) {
      const execution: ExecutionResult = {
        jobExecution: String(row[0] || ''),
        Status: String(row[1] || ''),
        ExecutionTime: String(row[2] || ''),
      };

      // Parse ErrorReasons (array)
      if (row[3] !== null && row[3] !== undefined) {
        try {
          execution.ErrorReasons = JSON.parse(String(row[3])) as string[];
        } catch {
          execution.ErrorReasons = [String(row[3])];
        }
      }

      // Parse Summary (object)
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

    return executions;
  } else {
    throw new Error(`Query failed: ${result.partialError?.message || 'Unknown error'}`);
  }
}

export function formatEmailSummary(executions: ExecutionResult[]): { html: string; text: string } {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${sevenDaysAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;

  const total = executions.length;
  const succeeded = executions.filter((e) => e.Status === 'Succeeded').length;
  const failed = executions.filter((e) => e.Status === 'Failed').length;

  // HTML version
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schnucks Clipper - Weekly Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    .summary { background: #f8f9fa; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; }
    .summary-item { margin: 5px 0; }
    .summary-label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #34495e; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f5f5f5; }
    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
    .status-succeeded { background: #27ae60; color: white; }
    .status-failed { background: #e74c3c; color: white; }
    .status-unknown { background: #95a5a6; color: white; }
    .error-reasons { color: #e74c3c; font-size: 0.9em; margin-top: 5px; }
    .summary-json { background: #f8f9fa; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.85em; margin-top: 5px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Schnucks Clipper - Weekly Summary</h1>
  <p><strong>Date Range:</strong> ${escapeHtml(dateRange)}</p>
  
  <div class="summary">
    <div class="summary-item"><span class="summary-label">Total Executions:</span> ${total}</div>
    <div class="summary-item"><span class="summary-label">Succeeded:</span> <span class="status-badge status-succeeded">${succeeded}</span></div>
    <div class="summary-item"><span class="summary-label">Failed:</span> <span class="status-badge status-failed">${failed}</span></div>
  </div>
`;

  if (executions.length === 0) {
    html += '<p><em>No job executions found in the past 7 days.</em></p>';
  } else {
    html += `
  <table>
    <thead>
      <tr>
        <th>Execution</th>
        <th>Status</th>
        <th>Time</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
`;

    for (const exec of executions) {
      // Sanitize status for CSS class name (only allow alphanumeric, hyphens, underscores)
      const statusClass = `status-${exec.Status.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      const executionTime = new Date(exec.ExecutionTime).toLocaleString();

      html += `
      <tr>
        <td><code>${escapeHtml(exec.jobExecution)}</code></td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(exec.Status)}</span></td>
        <td>${escapeHtml(executionTime)}</td>
        <td>`;

      if (exec.Status === 'Failed' && exec.ErrorReasons && exec.ErrorReasons.length > 0) {
        html += `<div class="error-reasons"><strong>Errors:</strong><ul>`;
        for (const error of exec.ErrorReasons) {
          html += `<li>${escapeHtml(error)}</li>`;
        }
        html += `</ul></div>`;
      } else if (exec.Status === 'Succeeded' && exec.Summary) {
        html += `<div class="summary-json">${escapeHtml(JSON.stringify(exec.Summary, null, 2))}</div>`;
      }

      html += `</td>
      </tr>
`;
    }

    html += `
    </tbody>
  </table>
`;
  }

  html += `
  <div class="footer">
    <p>This is an automated weekly summary from the Schnucks Coupon Clipper.</p>
  </div>
</body>
</html>
`;

  // Plain text version
  let text = `Schnucks Clipper - Weekly Summary\n`;
  text += `Date Range: ${dateRange}\n\n`;
  text += `Summary:\n`;
  text += `  Total Executions: ${total}\n`;
  text += `  Succeeded: ${succeeded}\n`;
  text += `  Failed: ${failed}\n\n`;

  if (executions.length === 0) {
    text += `No job executions found in the past 7 days.\n`;
  } else {
    text += `Detailed Results:\n`;
    text += `${'='.repeat(80)}\n\n`;

    for (const exec of executions) {
      const executionTime = new Date(exec.ExecutionTime).toLocaleString();
      text += `Execution: ${exec.jobExecution}\n`;
      text += `Status: ${exec.Status}\n`;
      text += `Time: ${executionTime}\n`;

      if (exec.Status === 'Failed' && exec.ErrorReasons && exec.ErrorReasons.length > 0) {
        text += `Errors:\n`;
        for (const error of exec.ErrorReasons) {
          text += `  - ${error}\n`;
        }
      } else if (exec.Status === 'Succeeded' && exec.Summary) {
        text += `Summary: ${JSON.stringify(exec.Summary)}\n`;
      }

      text += `\n${'-'.repeat(80)}\n\n`;
    }
  }

  return { html, text };
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

async function sendEmail(
  config: WeeklySummaryConfig,
  htmlBody: string,
  textBody: string,
): Promise<void> {
  logger.info('Configuring SMTP transporter...', { host: config.smtpHost, port: config.smtpPort });

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${sevenDaysAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;

  logger.info('Sending email...', { from: config.emailFrom, to: config.emailTo });

  const info = await transporter.sendMail({
    from: config.emailFrom,
    to: config.emailTo,
    subject: `Schnucks Clipper - Weekly Summary (${dateRange})`,
    html: htmlBody,
    text: textBody,
  });

  logger.info('Email sent successfully', { messageId: info.messageId });
}

export async function runWeeklySummary() {
  logger.info('Weekly Summary Job starting...');

  // Lazy-load config only when actually running the weekly summary job
  // This prevents validation errors when the module is imported but not used
  const config = getWeeklySummaryConfig();

  try {
    // 1. Query Log Analytics
    logger.info('Querying Log Analytics workspace...', {
      workspaceId: config.logAnalyticsWorkspaceId,
    });
    const executions = await queryLogAnalytics(
      config.logAnalyticsWorkspaceId,
      WEEKLY_SUMMARY_QUERY,
    );

    logger.info('Query completed', { executionCount: executions.length });

    // 2. Format email
    logger.info('Formatting email summary...');
    const { html, text } = formatEmailSummary(executions);

    // 3. Send email
    await sendEmail(config, html, text);

    logger.info('Weekly summary job completed successfully');
  } catch (error) {
    logger.error('Weekly summary job failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
