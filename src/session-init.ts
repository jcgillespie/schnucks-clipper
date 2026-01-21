import playwright from 'playwright-chromium';
const { chromium } = playwright;
import { logger } from './logger.js';
import { saveSessionData } from './session.js';
import { SessionData } from './api.js';
import { config } from './config.js';

async function initializeSession() {
  logger.info('Starting manual session initialization...');
  logger.info('This will launch a headful browser. Please log in and complete TFA.');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(config.schnucksBaseUrl);

  logger.info('Waiting for you to log in...');
  logger.info('>>> PRESS ENTER IN THIS TERMINAL ONCE YOU HAVE COMPLETED LOGIN AND TFA <<<');

  // Wait for user to press enter in the terminal
  await new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      process.stdin.pause();
      resolve(data);
    });
  });

  try {
    const storageState = await context.storageState();

    // Extract client ID from localStorage
    const origin = storageState.origins.find(
      (o) => o.origin === config.schnucksBaseUrl || o.origin.includes('schnucks.com'),
    );
    const clientIdObj = origin?.localStorage.find((item) => item.name === 'schnucks-client-id');

    if (!clientIdObj) {
      throw new Error('Could not find schnucks-client-id in storage state');
    }

    // Explicitly map Playwright storage state to SessionData to ensure compatibility
    const sessionData: SessionData = {
      clientId: clientIdObj.value,
      cookies: storageState.cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
      })),
    };

    await saveSessionData(sessionData);
    logger.info('Session initialization complete! You can now run the clipper.');
  } catch (error) {
    logger.error('Failed to save session context during initialization.', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await browser.close();
  }
}

initializeSession()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error during session initialization:', err);
    process.exit(1);
  });
