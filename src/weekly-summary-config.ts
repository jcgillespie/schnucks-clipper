import dotenv from 'dotenv';

dotenv.config({ override: true });

export interface WeeklySummaryConfig {
  logAnalyticsWorkspaceId: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
  emailTo: string;
  jobName?: string;
  // Health digest configuration
  schedule: 'daily' | 'weekly';
  lookbackDays: number;
  sendOnSuccess: boolean;
}

function validateConfig(): WeeklySummaryConfig {
  const logAnalyticsWorkspaceId = process.env.LOG_ANALYTICS_WORKSPACE_ID;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM;
  const emailTo = process.env.EMAIL_TO;
  const jobName = process.env.JOB_NAME;

  // Health digest configuration
  const schedule = (process.env.HEALTH_DIGEST_SCHEDULE || 'weekly') as 'daily' | 'weekly';
  const lookbackDays = schedule === 'daily' ? 1 : 7;
  const sendOnSuccess = process.env.HEALTH_DIGEST_SEND_ON_SUCCESS === 'true';

  if (!logAnalyticsWorkspaceId) {
    throw new Error('MISSING_CONFIG: LOG_ANALYTICS_WORKSPACE_ID environment variable is required.');
  }

  if (!smtpHost) {
    throw new Error('MISSING_CONFIG: SMTP_HOST environment variable is required.');
  }

  if (!smtpUser) {
    throw new Error('MISSING_CONFIG: SMTP_USER environment variable is required.');
  }

  if (!smtpPass) {
    throw new Error('MISSING_CONFIG: SMTP_PASS environment variable is required.');
  }

  if (!emailFrom) {
    throw new Error('MISSING_CONFIG: EMAIL_FROM environment variable is required.');
  }

  if (!emailTo) {
    throw new Error('MISSING_CONFIG: EMAIL_TO environment variable is required.');
  }

  if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error(
      `INVALID_CONFIG: SMTP_PORT "${process.env.SMTP_PORT}" is not a valid port number.`,
    );
  }

  return {
    logAnalyticsWorkspaceId,
    smtpHost,
    smtpPort,
    schedule,
    lookbackDays,
    sendOnSuccess,
    smtpUser,
    smtpPass,
    emailFrom,
    emailTo,
    jobName,
  };
}

// Lazy config getter - only validates when actually called
// This prevents validation errors when the module is imported but not used
let _config: WeeklySummaryConfig | null = null;

export function getWeeklySummaryConfig(): WeeklySummaryConfig {
  if (_config === null) {
    _config = validateConfig();
  }
  return _config;
}
