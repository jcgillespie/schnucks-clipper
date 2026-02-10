import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ override: true });

export interface Config {
  schnucksBaseUrl: string;
  dataPath: string;
  sessionFile: string;
  logLevel: string;
  clipConcurrency: number;
}

function validateConfig(): Config {
  const schnucksBaseUrl = process.env.SCHNUCKS_BASE_URL || 'https://schnucks.com';
  const dataPath = process.env.DATA_PATH || './data';
  const sessionFile = process.env.SESSION_FILE || path.join(dataPath, 'session.json');
  const logLevel = process.env.LOG_LEVEL || 'info';
  const clipConcurrency = parseInt(process.env.CLIP_CONCURRENCY || '10', 10);

  if (!schnucksBaseUrl) {
    throw new Error('MISSING_CONFIG: SCHNUCKS_BASE_URL environment variable is required.');
  }

  try {
    new URL(schnucksBaseUrl);
  } catch {
    throw new Error(`INVALID_CONFIG: SCHNUCKS_BASE_URL "${schnucksBaseUrl}" is not a valid URL.`);
  }

  if (clipConcurrency < 1 || clipConcurrency > 50) {
    throw new Error(`INVALID_CONFIG: CLIP_CONCURRENCY must be between 1 and 50, got ${clipConcurrency}`);
  }

  return {
    schnucksBaseUrl,
    dataPath: path.resolve(dataPath),
    sessionFile: path.resolve(sessionFile),
    logLevel: logLevel.toLowerCase(),
    clipConcurrency,
  };
}

export const config = validateConfig();
