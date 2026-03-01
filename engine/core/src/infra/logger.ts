import type { LoggerPort } from '../ports/logger.port.js';

export const createLogger = (prefix?: string): LoggerPort => {
  const tag = prefix !== undefined ? `[${prefix}]` : '';

  const info = (message: string, ...args: unknown[]): void => {
    console.log(tag, message, ...args);
  };

  const warn = (message: string, ...args: unknown[]): void => {
    console.warn(tag, message, ...args);
  };

  const error = (message: string, ...args: unknown[]): void => {
    console.error(tag, message, ...args);
  };

  const debug = (message: string, ...args: unknown[]): void => {
    if (process.env['DEBUG'] !== undefined) {
      console.debug(tag, message, ...args);
    }
  };

  return Object.freeze({ info, warn, error, debug });
};

export type Logger = ReturnType<typeof createLogger>;
