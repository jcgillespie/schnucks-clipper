import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { loadSessionData, saveSessionData, isSessionValid } from '../../src/session.js';
import { config } from '../../src/config.js';

describe('Session Management', () => {
  const testSessionPath = path.join(config.dataPath, 'test-session.json');

  before(async () => {
    await fs.mkdir(config.dataPath, { recursive: true });
  });

  after(async () => {
    try {
      await fs.unlink(testSessionPath);
    } catch {
      // Ignore error if file doesn't exist
    }
  });

  test('loadSessionData should return empty structure if session file is missing', async () => {
    // Override config session file for test
    const originalSessionFile = config.sessionFile;
    (config as { sessionFile: string }).sessionFile = path.join(
      config.dataPath,
      'non-existent.json',
    );

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

  test('loadSessionData should return empty structure on invalid JSON', async () => {
    const originalSessionFile = config.sessionFile;
    const invalidSessionPath = path.join(config.dataPath, 'invalid-session.json');
    (config as { sessionFile: string }).sessionFile = invalidSessionPath;

    try {
      await fs.writeFile(invalidSessionPath, '{not-json', 'utf8');
      const sessionData = await loadSessionData();
      assert.deepStrictEqual(sessionData, { cookies: [], clientId: '' });
    } finally {
      (config as { sessionFile: string }).sessionFile = originalSessionFile;
      try {
        await fs.unlink(invalidSessionPath);
      } catch {
        // Ignore error if file doesn't exist
      }
    }
  });

  test('isSessionValid should fail when clientId is missing', async () => {
    const isValid = await isSessionValid({ cookies: [], clientId: '' });
    assert.strictEqual(isValid, false);
  });

  test('isSessionValid should fail when cookies are missing', async () => {
    const isValid = await isSessionValid({ cookies: [], clientId: 'id' });
    assert.strictEqual(isValid, false);
  });

  test('isSessionValid should fail when no auth cookies found', async () => {
    const isValid = await isSessionValid({
      clientId: 'id',
      cookies: [
        { name: 'other', value: '1', domain: 'example.com', path: '/', expires: 9999999999 },
      ],
    });
    assert.strictEqual(isValid, false);
  });

  test('isSessionValid should fail when auth cookies expired', async () => {
    const isValid = await isSessionValid({
      clientId: 'id',
      cookies: [{ name: 'session', value: '1', domain: 'example.com', path: '/', expires: 1 }],
    });
    assert.strictEqual(isValid, false);
  });

  test('isSessionValid should pass when auth cookie valid', async () => {
    const isValid = await isSessionValid({
      clientId: 'id',
      cookies: [
        { name: 'session', value: '1', domain: 'example.com', path: '/', expires: 9999999999 },
      ],
    });
    assert.strictEqual(isValid, true);
  });

  test('isSessionValid should pass for non-expiring auth cookie', async () => {
    const isValid = await isSessionValid({
      clientId: 'id',
      cookies: [{ name: 'token', value: '1', domain: 'example.com', path: '/', expires: 0 }],
    });
    assert.strictEqual(isValid, true);
  });
});
