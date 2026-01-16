type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

import { config } from './config.js';

const currentLogLevel = (config.logLevel as LogLevel) || 'info';
const currentPriority = LOG_LEVELS[currentLogLevel] ?? 1;

function log(level: LogLevel, message: string, context?: Record<string, any>) {
  if (LOG_LEVELS[level] < currentPriority) {
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...context,
  };

  process.stdout.write(JSON.stringify(logEntry) + '\n');
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, any>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, any>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, any>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, any>) => log('error', msg, ctx),
};
