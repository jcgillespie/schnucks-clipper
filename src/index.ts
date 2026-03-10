import { logger } from './logger.js';
import { config } from './config.js';
import { loadSessionData, isSessionValid } from './session.js';
import { clipAllCoupons } from './clipper.js';
import { runWeeklySummary } from './weekly-summary.js';
import { AppConfigRunSummaryStore } from './run-summary-store-appconfig.js';
import type { IRunSummaryStore } from './run-summary-store.js';

// Initialize run summary store if app config is configured
let runSummaryStore: IRunSummaryStore | null = null;

if (config.appConfigEndpoint) {
  try {
    runSummaryStore = new AppConfigRunSummaryStore(
      config.appConfigEndpoint,
      config.appConfigConnectionString,
    );
    logger.debug('Run summary store initialized with App Configuration');
  } catch (error) {
    logger.warn('Failed to initialize run summary store', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Generate a unique execution ID
function generateExecutionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

async function runClipper() {
  logger.debug('Schnucks Coupon Clipper starting...');

  const executionId = generateExecutionId();

  // 1. Load session data directly from file
  const sessionData = await loadSessionData();

  try {
    // 2. Validate session
    if (!(await isSessionValid(sessionData))) {
      logger.error('CRITICAL: Valid session not found. Please follow these steps:');
      logger.error('1. Run the clipping application locally with `npm run session:init`');
      logger.error('2. Perform manual login and TFA');
      logger.error('3. Ensure the browser is closed after login to save session.json');

      // Write failure record to summary store (best-effort; don't let telemetry mask the real error)
      if (runSummaryStore) {
        await runSummaryStore.writeRun({
          timestamp: Date.now(),
          executionId,
          status: 'failure',
          jobType: 'clipper',
          errorReasons: ['RE-AUTHENTICATE'],
          errorMessage: 'Valid session not found - authentication required',
        }).catch((err) => logger.warn('Failed to write run summary', { error: err instanceof Error ? err.message : String(err) }));
      }

      process.exit(1);
    }

    // 3. Clip coupons using the session data
    const summary = await clipAllCoupons(sessionData);

    // Note: We are not saving the session back because we are using simple fetch
    // and not automatically rotating cookies. If cookie rotation is needed,
    // we would need to parse 'set-cookie' headers from responses.

    logger.debug('Job completed successfully.', { summary });

    // Write success record to summary store (best-effort; don't let telemetry fail the job)
    if (runSummaryStore) {
      await runSummaryStore.writeRun({
        timestamp: Date.now(),
        executionId,
        status: 'success',
        jobType: 'clipper',
        clipped: summary.clipped,
        failed: summary.failed,
        skipped: summary.skipped,
      }).catch((err) => logger.warn('Failed to write run summary', { error: err instanceof Error ? err.message : String(err) }));
    }
  } catch (error) {
    logger.error('An unexpected error occurred during execution.', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Write failure record to summary store (best-effort)
    if (runSummaryStore) {
      await runSummaryStore.writeRun({
        timestamp: Date.now(),
        executionId,
        status: 'failure',
        jobType: 'clipper',
        errorReasons: ['EXECUTION_ERROR'],
        errorMessage: error instanceof Error ? error.message : String(error),
      }).catch((err) => logger.warn('Failed to write run summary', { error: err instanceof Error ? err.message : String(err) }));
    }

    process.exit(1);
  }
}

async function main() {
  // Check if we should run weekly summary instead of clipper
  const jobType = process.env.JOB_TYPE || 'clipper';

  if (jobType === 'weekly-summary') {
    await runWeeklySummary();
  } else {
    await runClipper();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error in main loop:', err);
    process.exit(1);
  });
