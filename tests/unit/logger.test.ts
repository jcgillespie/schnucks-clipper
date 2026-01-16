import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { logger } from '../../src/logger.js';

describe('Logger', () => {
  let originalWrite: typeof process.stdout.write;
  let logOutput: string[] = [];

  before(() => {
    originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      logOutput.push(chunk.toString());
      return true;
    }) as unknown as typeof process.stdout.write;
  });

  after(() => {
    process.stdout.write = originalWrite;
  });

  test('should log info messages as JSON', () => {
    logOutput = [];
    logger.info('test message', { key: 'value' });

    assert.strictEqual(logOutput.length, 1);
    const entry = JSON.parse(logOutput[0]);
    assert.strictEqual(entry.level, 'INFO');
    assert.strictEqual(entry.message, 'test message');
    assert.strictEqual(entry.key, 'value');
    assert.ok(entry.timestamp);
  });

  test('should log error messages as JSON', () => {
    logOutput = [];
    logger.error('error message');

    assert.strictEqual(logOutput.length, 1);
    const entry = JSON.parse(logOutput[0]);
    assert.strictEqual(entry.level, 'ERROR');
    assert.strictEqual(entry.message, 'error message');
  });
});
