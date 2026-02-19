import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ToolError } from '../types/errors.js';

const execAsync = promisify(exec);

const ALLOWED_COMMANDS = new Set([
  'bun', 'npm', 'npx', 'node', 'tsc', 'eslint', 'prettier',
  'git', 'cargo', 'rustc', 'rustfmt', 'clippy',
  'ls', 'cat', 'head', 'tail', 'wc', 'find', 'grep', 'rg',
  'echo', 'pwd', 'which', 'env', 'mkdir', 'cp', 'mv', 'touch',
]);

const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 30_000;

export interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

const extractFirstToken = (command: string): string => {
  const trimmed = command.trim();
  // Handle env var prefixes like "FOO=bar cmd"
  const withoutEnvVars = trimmed.replace(/^(?:\w+=\S+\s+)+/, '');
  const firstToken = withoutEnvVars.split(/[\s;|&]/)[0] ?? '';
  // Handle paths like /usr/bin/git → git
  return firstToken.split('/').pop() ?? '';
};

export const runCommand = async (
  command: string,
  cwd?: string,
  timeout?: number,
): Promise<CommandResult> => {
  const token = extractFirstToken(command);

  if (!ALLOWED_COMMANDS.has(token)) {
    throw new ToolError(`Command not allowed: "${token}". Allowed: ${[...ALLOWED_COMMANDS].join(', ')}`);
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
    if (error !== null && typeof error === 'object' && 'killed' in error && error.killed) {
      throw new ToolError(`Command timed out after ${effectiveTimeout}ms`);
    }

    if (error !== null && typeof error === 'object') {
      const stdout = 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '';
      const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : '';
      const code = 'code' in error && typeof error.code === 'number' ? error.code : 1;
      return { stdout, stderr, exitCode: code };
    }

    return { stdout: '', stderr: String(error), exitCode: 1 };
  }
};
