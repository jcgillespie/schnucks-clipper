import { test, describe } from 'node:test';
import assert from 'node:assert';
import { config } from '../../src/config.js';

describe('Config Loader', () => {
  test('should have a valid base URL', () => {
    assert.strictEqual(typeof config.schnucksBaseUrl, 'string');
    assert.doesNotThrow(() => new URL(config.schnucksBaseUrl));
  });

  test('should resolve data path', () => {
    assert.strictEqual(typeof config.dataPath, 'string');
    assert.ok(config.dataPath.startsWith('/')); // Absolute path
  });

  test('should have a session file path', () => {
    assert.strictEqual(typeof config.sessionFile, 'string');
    assert.ok(config.sessionFile.includes('session.json'));
  });
});
