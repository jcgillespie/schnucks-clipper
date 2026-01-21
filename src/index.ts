import playwright from 'playwright-chromium';
const { chromium } = playwright;
import { logger } from './logger.js';
import { loadContext, saveContext, isSessionValid } from './session.js';
import { clipAllCoupons } from './clipper.js';

async function main() {
  logger.info('Schnucks Coupon Clipper starting...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await loadContext(browser);

  try {
    if (!(await isSessionValid(context))) {
      logger.error('CRITICAL: Valid session not found. Please follow these steps:');
      logger.error('1. Run the clipping application locally with `npm run session:init`');
      logger.error('2. Perform manual login and TFA');
      logger.error('3. Ensure the browser is closed after login to save session.json');
      process.exit(1);
    }

    const summary = await clipAllCoupons(context);

    await saveContext(context);

    logger.info('Job completed successfully.', { summary });
  } catch (error) {
    logger.error('An unexpected error occurred during execution.', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  } finally {
    await browser.close();
    logger.info('Browser closed. Exiting.');
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
