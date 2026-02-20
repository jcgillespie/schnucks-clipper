import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';
import { config } from './config.js';
import { SessionData } from './api.js';

export async function loadSessionData(): Promise<SessionData> {
  const sessionPath = config.sessionFile;

  try {
    const data = await fs.readFile(sessionPath, 'utf-8');
    logger.debug('Loading existing session data', { path: sessionPath });
    return JSON.parse(data) as SessionData;
  } catch (error) {
    logger.warn('No existing session data found or validation failed.', {
      path: sessionPath,
      error: error instanceof Error ? error.message : String(error),
    });
    // Return empty structure or throw - for now throwing effectively stops the app which is correct for batch job
    // But original code returned empty context.
    // Let's return empty structure to allow initial checks to fail gracefully
    return { cookies: [], clientId: '' };
  }
}

export async function saveSessionData(sessionData: SessionData): Promise<void> {
  const sessionPath = config.sessionFile;
  const dataDir = path.dirname(sessionPath);

  try {
    await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
    await fs.chmod(sessionPath, 0o600);
    logger.debug('Session data saved successfully', { path: sessionPath });
  } catch (error) {
    logger.error('Failed to save session data', {
      path: sessionPath,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function isSessionValid(sessionData: SessionData): Promise<boolean> {
  const cookies = sessionData.cookies;
  const nowSeconds = Date.now() / 1000;

  if (!sessionData.clientId) {
    logger.warn(
      'MISSING_CLIENT_ID: schnucks-client-id not found in session data. Please re-authenticate.',
    );
    return false;
  }

  if (!cookies || cookies.length === 0) {
    logger.warn('RE-AUTHENTICATE: No cookies found in session data. Please re-authenticate.');
    return false;
  }

  const authCookies = cookies.filter(
    (c) => c.name.toLowerCase().includes('token') || c.name.toLowerCase().includes('session'),
  );
  const hasValidAuthCookie = authCookies.some((c) => c.expires <= 0 || c.expires > nowSeconds);

  if (authCookies.length === 0) {
    logger.warn('RE-AUTHENTICATE: No authentication cookies found. Please re-authenticate.');
    return false;
  }

  if (!hasValidAuthCookie) {
    logger.warn('RE-AUTHENTICATE: Authentication cookies have expired. Please re-authenticate.');
    return false;
  }

  return true;
}
