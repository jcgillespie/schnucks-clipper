import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';
import { config } from './config.js';
import { SessionData } from './api.js';

export async function loadSessionData(): Promise<SessionData> {
  const sessionPath = config.sessionFile;

  try {
    const data = await fs.readFile(sessionPath, 'utf-8');
    logger.info('Loading existing session data', { path: sessionPath });
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
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
    logger.info('Session data saved successfully', { path: sessionPath });
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
  // Simple check: do we have a session cookie?
  const hasAuthToken = cookies.some(
    (c) => c.name.toLowerCase().includes('token') || c.name.toLowerCase().includes('session'),
  );

  if (!hasAuthToken) {
    logger.warn('Session invalid or expired: No authentication tokens found in cookies.');
    return false;
  }

  return true;
}
