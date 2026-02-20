import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ToolError } from '../types/errors.js';

const execAsync = promisify(exec);

const ALLOWED_COMMANDS = new Set([
  'bun', 'npm', 'npx', 'node', 'tsc', 'eslint', 'prettier',
  'git', 'cargo', 'rustc', 'rustfmt', 'clippy',
  'ls', 'cat', 'head', 'tail', 'wc', 'find', 'grep',
  'echo', 'mkdir', 'cp', 'mv', 'touch', 'diff',
]);

const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 30_000;

export interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export const runCommand = async (
  command: string,
  cwd?: string,
  timeout?: number,
): Promise<CommandResult> => {
  const baseCmd = command.trim().split(/\s+/)[0] ?? '';
  if (!ALLOWED_COMMANDS.has(baseCmd)) {
    throw new ToolError(`Command not allowed: ${baseCmd}. Allowed: ${[...ALLOWED_COMMANDS].join(', ')}`);
  }

  const effectiveTimeout = Math.min(timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT);

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: effectiveTimeout,
      maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env, NODE_ENV: 'development' },
    });

    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const isRec = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;

    if (isRec(error) && 'killed' in error && error['killed'] === true) {
      throw new ToolError(`Command timed out after ${effectiveTimeout}ms`);
    }

    const rec = isRec(error) ? error : {};
    return {
      stdout: typeof rec['stdout'] === 'string' ? rec['stdout'] : '',
      stderr: typeof rec['stderr'] === 'string' ? rec['stderr'] : '',
      exitCode: typeof rec['code'] === 'number' ? rec['code'] : 1,
    };
  }
};
