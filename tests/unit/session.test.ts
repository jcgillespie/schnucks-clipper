import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import playwright from 'playwright-chromium';
const { chromium } = playwright;
type Browser = import('playwright-chromium').Browser;
import { loadContext, saveContext } from '../../src/session.js';
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

  test('loadContext should create a new context if session file is missing', async () => {
    const context = await loadContext(browser);
    assert.ok(context);
    await context.close();
  });

  test('saveContext should persist storage state to disk', async () => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'test-cookie',
        value: 'test-value',
        domain: 'example.com',
        path: '/',
        expires: Date.now() / 1000 + 3600,
      },
    ]);

    // Override config session file for test
    const originalSessionFile = config.sessionFile;
    (config as any).sessionFile = testSessionPath;

    try {
      await saveContext(context);
      await fs.access(testSessionPath);
      const content = JSON.parse(await fs.readFile(testSessionPath, 'utf8'));
      assert.ok(content.cookies.some((c: any) => c.name === 'test-cookie'));
    } finally {
      (config as any).sessionFile = originalSessionFile;
      await context.close();
    }
  });
});
