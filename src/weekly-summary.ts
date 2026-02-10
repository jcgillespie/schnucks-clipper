import { DefaultAzureCredential } from '@azure/identity';
import { LogsQueryClient, LogsQueryResultStatus } from '@azure/monitor-query-logs';
import nodemailer from 'nodemailer';
import { logger } from './logger.js';
import { getWeeklySummaryConfig, type WeeklySummaryConfig } from './weekly-summary-config.js';

// Build KQL query dynamically based on lookback days
function buildSummaryQuery(lookbackDays: number): string {
  return `
let allLogs =
  ContainerAppConsoleLogs_CL
  | where TimeGenerated > ago(${lookbackDays}d)
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
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  hasErrors: boolean;
  hasAuthFailures: boolean;
  hasContainerIssues: boolean;
  totalExecutions: number;
  failedExecutions: number;
  successfulExecutions: number;
}
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

async function queryLogAnalytics(
  workspaceId: string,
  query: string,
  lookbackDays: number,
): Promise<ExecutionResult[]> {
  logger.debug('Authenticating to Azure...');
  const credential = new DefaultAzureCredential();

  logger.debug('Creating LogsQueryClient...');
  const client = new LogsQueryClient(credential);

  logger.debug('Executing KQL query...', { workspaceId, lookbackDays });
  const result = await client.queryWorkspace(workspaceId, query, {
    duration: `P${lookbackDays}D`,
  });

  if (result.status === LogsQueryResultStatus.Success) {
    logger.debug('Query executed successfully', {
      tables: result.tables.length,
      rows: result.tables.reduce((sum, table) => sum + table.rows.length, 0),
    });

    if (result.tables.length === 0 || result.tables[0].rows.length === 0) {
      logger.debug('No execution results found in the past 7 days');
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

function calculateHealthStatus(executions: ExecutionResult[]): HealthStatus {
  const totalExecutions = executions.length;
  const failedExecutions = executions.filter((e) => e.Status === 'Failed').length;
  const successfulExecutions = executions.filter((e) => e.Status === 'Succeeded').length;

  // Check for authentication failures
  const hasAuthFailures = executions.some((e) =>
    e.ErrorReasons?.some(
      (err) =>
        err?.includes('RE-AUTHENTICATE') ||
        err?.includes('MISSING_CLIENT_ID') ||
        err?.includes('authentication'),
    ),
  );

  // Check for any errors
  const hasErrors = failedExecutions > 0;

  // Determine container issues (would need system logs query, simplified here)
  const hasContainerIssues = false;

  let status: 'healthy' | 'warning' | 'error' = 'healthy';
  if (hasAuthFailures || failedExecutions >= 3) {
    status = 'error';
  } else if (hasErrors) {
    status = 'warning';
  }

  return {
    status,
    hasErrors,
    hasAuthFailures,
    hasContainerIssues,
    totalExecutions,
    failedExecutions,
    successfulExecutions,
  };
}

interface PeriodSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalCouponsClipped: number;
  totalCouponsFailed: number;
  totalCouponsSkipped: number;
  failureDetails: string[];
}

function aggregateExecutions(executions: ExecutionResult[]): PeriodSummary {
  let totalCouponsClipped = 0;
  let totalCouponsFailed = 0;
  let totalCouponsSkipped = 0;
  const failureDetails: string[] = [];

  for (const exec of executions) {
    if (exec.Status === 'Succeeded' && exec.Summary) {
      totalCouponsClipped += exec.Summary.clipped || 0;
      totalCouponsFailed += exec.Summary.failed || 0;
      totalCouponsSkipped += exec.Summary.skipped || 0;
    } else if (exec.Status === 'Failed' && exec.ErrorReasons) {
      // Track failures with timestamps
      const executionTime = new Date(exec.ExecutionTime).toLocaleDateString();
      for (const error of exec.ErrorReasons) {
        failureDetails.push(`${executionTime}: ${error}`);
      }
    }
  }

  const successfulRuns = executions.filter((e) => e.Status === 'Succeeded').length;
  const failedRuns = executions.filter((e) => e.Status === 'Failed').length;

  return {
    totalRuns: executions.length,
    successfulRuns,
    failedRuns,
    totalCouponsClipped,
    totalCouponsFailed,
    totalCouponsSkipped,
    failureDetails,
  };
}

export function formatEmailSummary(
  executions: ExecutionResult[],
  lookbackDays: number,
  config: WeeklySummaryConfig,
): { html: string; text: string } {
  const now = new Date();
  const startDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const dateRange = `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`;
  const reportType = config.schedule === 'daily' ? 'Daily Health Digest' : 'Weekly Summary';

  const healthStatus = calculateHealthStatus(executions);
  const summary = aggregateExecutions(executions);

  // Determine status badge
  let statusBadge = '';
  let statusEmoji = '';
  if (healthStatus.status === 'healthy') {
    statusBadge = '<span class="status-badge status-healthy">✅ All Systems Operational</span>';
    statusEmoji = '✅';
  } else if (healthStatus.status === 'warning') {
    statusBadge = '<span class="status-badge status-warning">⚠️ Warnings Detected</span>';
    statusEmoji = '⚠️';
  } else {
    statusBadge = '<span class="status-badge status-error">❌ Failures Detected</span>';
    statusEmoji = '❌';
  }

  // HTML version
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schnucks Clipper - ${escapeHtml(reportType)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; font-size: 1.1em; margin-top: 20px; margin-bottom: 10px; }
    .health-status { background: #f8f9fa; border-left: 4px solid #3498db; padding: 20px; margin: 20px 0; font-size: 1.2em; text-align: center; }
    .summary { background: #f8f9fa; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; }
    .summary-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 10px 0; }
    .summary-item { padding: 10px; background: white; border-radius: 4px; }
    .summary-label { font-weight: bold; color: #34495e; font-size: 0.9em; text-transform: uppercase; }
    .summary-value { font-size: 1.8em; color: #2c3e50; margin-top: 5px; font-weight: bold; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .alert-box.error { background: #f8d7da; border-left-color: #dc3545; }
    .error-list { margin: 10px 0; padding-left: 20px; }
    .error-list li { margin: 5px 0; color: #e74c3c; font-size: 0.9em; }
    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
    .status-healthy { background: #27ae60; color: white; }
    .status-warning { background: #f39c12; color: white; }
    .status-error { background: #e74c3c; color: white; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Schnucks Clipper - ${escapeHtml(reportType)}</h1>
  <p><strong>Date Range:</strong> ${escapeHtml(dateRange)}</p>
  
  <div class="health-status">
    <strong>Status:</strong> ${statusBadge}
  </div>
`;

  // Add alert box for failures
  if (healthStatus.status === 'error') {
    html += `
  <div class="alert-box error">
    <strong>⚠️ Action Required:</strong><br>`;
    if (healthStatus.hasAuthFailures) {
      html += `    • Session expired - Update session.json and redeploy<br>`;
    }
    if (healthStatus.failedExecutions >= 3) {
      html += `    • Multiple failures detected - Check logs in Azure Portal<br>`;
    }
    html += `  </div>
`;
  } else if (healthStatus.status === 'warning') {
    html += `
  <div class="alert-box">
    <strong>Note:</strong> Some issues detected but system is recovering. Review details below.
  </div>
`;
  }

  if (executions.length === 0) {
    html += '<p><em>No job executions found in the reporting period.</em></p>';
  } else {
    html += `
  <h2>Period Summary</h2>
  <div class="summary">
    <div class="summary-row">
      <div class="summary-item">
        <div class="summary-label">Total Job Runs</div>
        <div class="summary-value">${summary.totalRuns}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Successful Runs</div>
        <div class="summary-value" style="color: #27ae60;">${summary.successfulRuns}</div>
      </div>
    </div>
    ${summary.failedRuns > 0 ? `
    <div class="summary-row">
      <div class="summary-item">
        <div class="summary-label">Failed Runs</div>
        <div class="summary-value" style="color: #e74c3c;">${summary.failedRuns}</div>
      </div>
    </div>
    ` : ''}
  </div>

  <h2>Coupons Clipped</h2>
  <div class="summary">
    <div class="summary-row">
      <div class="summary-item">
        <div class="summary-label">Total Clipped</div>
        <div class="summary-value" style="color: #27ae60;">${summary.totalCouponsClipped}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Failed to Clip</div>
        <div class="summary-value" style="color: #e74c3c;">${summary.totalCouponsFailed}</div>
      </div>
    </div>
    ${summary.totalCouponsSkipped > 0 ? `
    <div class="summary-row">
      <div class="summary-item">
        <div class="summary-label">Skipped</div>
        <div class="summary-value">${summary.totalCouponsSkipped}</div>
      </div>
    </div>
    ` : ''}
  </div>
`;

    // Add failure details if there are any
    if (summary.failureDetails.length > 0) {
      html += `
  <h2>Issues Detected</h2>
  <div class="alert-box error">
    <ul class="error-list">
`;
      for (const detail of summary.failureDetails) {
        html += `      <li>${escapeHtml(detail)}</li>\n`;
      }
      html += `    </ul>
  </div>
`;
    }
  }

  html += `
  <div class="footer">
    <p>This is an automated ${config.schedule} report from the Schnucks Coupon Clipper.</p>
  </div>
</body>
</html>
`;

  // Plain text version
  let text = `Schnucks Clipper - ${reportType}\n`;
  text += `Date Range: ${dateRange}\n\n`;
  text += `Status: ${statusEmoji} ${healthStatus.status.toUpperCase()}\n\n`;

  if (healthStatus.status === 'error') {
    text += `ACTION REQUIRED:\n`;
    if (healthStatus.hasAuthFailures) {
      text += `  - Session expired - Update session.json and redeploy\n`;
    }
    if (healthStatus.failedExecutions >= 3) {
      text += `  - Multiple failures detected - Check logs in Azure Portal\n`;
    }
    text += `\n`;
  }

  if (executions.length === 0) {
    text += `No job executions found in the reporting period.\n`;
  } else {
    text += `PERIOD SUMMARY\n`;
    text += `${'-'.repeat(60)}\n`;
    text += `Total Job Runs: ${summary.totalRuns}\n`;
    text += `  Successful: ${summary.successfulRuns}\n`;
    if (summary.failedRuns > 0) {
      text += `  Failed: ${summary.failedRuns}\n`;
    }
    text += `\n`;
    text += `COUPONS CLIPPED\n`;
    text += `${'-'.repeat(60)}\n`;
    text += `Total Clipped: ${summary.totalCouponsClipped}\n`;
    text += `Failed to Clip: ${summary.totalCouponsFailed}\n`;
    if (summary.totalCouponsSkipped > 0) {
      text += `Skipped: ${summary.totalCouponsSkipped}\n`;
    }

    if (summary.failureDetails.length > 0) {
      text += `\nISSUES DETECTED\n`;
      text += `${'-'.repeat(60)}\n`;
      for (const detail of summary.failureDetails) {
        text += `• ${detail}\n`;
      }
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
  lookbackDays: number,
): Promise<void> {
  logger.debug('Configuring SMTP transporter...', { host: config.smtpHost, port: config.smtpPort });

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
  const startDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const dateRange = `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`;
  const reportType = config.schedule === 'daily' ? 'Daily Health Digest' : 'Weekly Summary';

  logger.debug('Sending email...', { from: config.emailFrom, to: config.emailTo });

  const info = await transporter.sendMail({
    from: config.emailFrom,
    to: config.emailTo,
    subject: `Schnucks Clipper - ${reportType} (${dateRange})`,
    html: htmlBody,
    text: textBody,
  });

  logger.debug('Email sent successfully', { messageId: info.messageId });
}

export async function runWeeklySummary() {
  logger.debug('Health Digest Job starting...');

  // Lazy-load config only when actually running the weekly summary job
  // This prevents validation errors when the module is imported but not used
  const config = getWeeklySummaryConfig();

  try {
    // 1. Query Log Analytics
    logger.debug('Querying Log Analytics workspace...', {
      workspaceId: config.logAnalyticsWorkspaceId,
      lookbackDays: config.lookbackDays,
      schedule: config.schedule,
    });
    const query = buildSummaryQuery(config.lookbackDays);
    const executions = await queryLogAnalytics(
      config.logAnalyticsWorkspaceId,
      query,
      config.lookbackDays,
    );

    logger.debug('Query completed', { executionCount: executions.length });

    // 2. Format email
    logger.debug('Formatting email summary...');
    const { html, text } = formatEmailSummary(executions, config.lookbackDays, config);

    // 3. Determine if we should send email
    const healthStatus = calculateHealthStatus(executions);
    const shouldSend = config.sendOnSuccess || healthStatus.status !== 'healthy';

    if (shouldSend) {
      await sendEmail(config, html, text, config.lookbackDays);
      logger.debug('Health digest job completed successfully', {
        emailSent: true,
        healthStatus: healthStatus.status,
      });
    } else {
      logger.debug('Health digest job completed successfully', {
        emailSent: false,
        reason: 'No issues detected and sendOnSuccess=false',
        healthStatus: healthStatus.status,
      });
    }
  } catch (error) {
    logger.error('Health digest job failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
