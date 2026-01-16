type Browser = import('playwright-chromium').Browser;
type BrowserContext = import('playwright-chromium').BrowserContext;
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';
import { config } from './config.js';

export async function loadContext(browser: Browser): Promise<BrowserContext> {
  const sessionPath = config.sessionFile;

  try {
    await fs.access(sessionPath);
    logger.info('Loading existing session context', { path: sessionPath });
    return await browser.newContext({ storageState: sessionPath });
  } catch {
    logger.warn('No existing session context found. Manual initial authentication required.', {
      path: sessionPath,
    });
    return await browser.newContext();
  }
}

export async function saveContext(context: BrowserContext): Promise<void> {
  const sessionPath = config.sessionFile;
  const dataDir = path.dirname(sessionPath);

  try {
    await fs.mkdir(dataDir, { recursive: true });
    await context.storageState({ path: sessionPath });
    logger.info('Session context saved successfully', { path: sessionPath });
  } catch (error) {
    logger.error('Failed to save session context', {
      path: sessionPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function isSessionValid(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  // Simple check: do we have a session cookie?
  // In a real scenario, we might check for 'connect.sid' or similar.
  // For Schnucks, we'll look for common auth indicators.
  const hasAuthToken = cookies.some(
    (c: any) => c.name.toLowerCase().includes('token') || c.name.toLowerCase().includes('session'),
  );

  if (!hasAuthToken) {
    logger.warn('Session invalid or expired: No authentication tokens found in cookies.');
    return false;
  }

  return true;
}
