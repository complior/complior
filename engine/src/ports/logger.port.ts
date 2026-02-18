export interface LoggerPort {
  readonly info: (message: string, ...args: unknown[]) => void;
  readonly warn: (message: string, ...args: unknown[]) => void;
  readonly error: (message: string, ...args: unknown[]) => void;
  readonly debug: (message: string, ...args: unknown[]) => void;
}
