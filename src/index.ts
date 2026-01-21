import { logger } from './logger.js';
import { loadSessionData, isSessionValid } from './session.js';
import { clipAllCoupons } from './clipper.js';

async function main() {
  logger.info('Schnucks Coupon Clipper starting...');

  // 1. Load session data directly from file
  const sessionData = await loadSessionData();

  try {
    // 2. Validate session
    if (!(await isSessionValid(sessionData))) {
      logger.error('CRITICAL: Valid session not found. Please follow these steps:');
      logger.error('1. Run the clipping application locally with `npm run session:init`');
      logger.error('2. Perform manual login and TFA');
      logger.error('3. Ensure the browser is closed after login to save session.json');
      process.exit(1);
    }

    // 3. Clip coupons using the session data
    const summary = await clipAllCoupons(sessionData);

    // Note: We are not saving the session back because we are using simple fetch
    // and not automatically rotating cookies. If cookie rotation is needed,
    // we would need to parse 'set-cookie' headers from responses.

    logger.info('Job completed successfully.', { summary });
  } catch (error) {
    logger.error('An unexpected error occurred during execution.', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
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
