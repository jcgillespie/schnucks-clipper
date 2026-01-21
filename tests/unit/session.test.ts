import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import playwright from 'playwright-chromium';
const { chromium } = playwright;
type Browser = import('playwright-chromium').Browser;
import { loadSessionData, saveSessionData } from '../../src/session.js';
import { config } from '../../src/config.js';

describe('Session Management', () => {
  let browser: Browser;
  const testSessionPath = path.join(config.dataPath, 'test-session.json');

  before(async () => {
    browser = await chromium.launch();
    await fs.mkdir(config.dataPath, { recursive: true });
  });

  after(async () => {
    await browser.close();
    try {
      await fs.unlink(testSessionPath);
    } catch {
      // Ignore error if file doesn't exist
    }
  });

  test('loadSessionData should return empty structure if session file is missing', async () => {
    // Override config session file for test
    const originalSessionFile = config.sessionFile;
    (config as { sessionFile: string }).sessionFile = path.join(config.dataPath, 'non-existent.json');

    try {
      const sessionData = await loadSessionData();
      assert.deepStrictEqual(sessionData, { cookies: [], clientId: '' });
    } finally {
      (config as { sessionFile: string }).sessionFile = originalSessionFile;
    }
  });

  test('saveSessionData should persist storage state to disk', async () => {
    const sessionData = {
      cookies: [
        {
          name: 'test-cookie',
          value: 'test-value',
          domain: 'example.com',
          path: '/',
          expires: Date.now() / 1000 + 3600,
        },
      ],
      clientId: 'test-client-id',
    };

    // Override config session file for test
    const originalSessionFile = config.sessionFile;
    (config as { sessionFile: string }).sessionFile = testSessionPath;

    try {
      await saveSessionData(sessionData);
      await fs.access(testSessionPath);
      const content = JSON.parse(await fs.readFile(testSessionPath, 'utf8')) as {
        cookies: { name: string }[];
      };
      assert.ok(content.cookies.some((c) => c.name === 'test-cookie'));
    } finally {
      (config as { sessionFile: string }).sessionFile = originalSessionFile;
    }
  });
});
