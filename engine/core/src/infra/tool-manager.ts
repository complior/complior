import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { ProcessRunner } from '../ports/process.port.js';

// Load pinned tool versions at module level
const TOOL_VERSIONS_PATH = resolve(
  fileURLToPath(import.meta.url), '..', '..', 'data', 'tool-versions.json',
);

export interface ToolVersionEntry {
  readonly package: string;
  readonly version: string;
  readonly description: string;
}

export interface ToolStatus {
  readonly name: string;
  readonly installed: boolean;
  readonly version?: string;
  readonly expectedVersion: string;
  readonly path?: string;
  readonly error?: string;
}

// Re-export ProcessRunner from port for backward compatibility
export type { ProcessRunner } from '../ports/process.port.js';

export interface ToolManager {
  readonly ensureTools: (tools: readonly string[]) => Promise<readonly ToolStatus[]>;
  readonly getToolStatus: () => Promise<readonly ToolStatus[]>;
  readonly updateTools: () => Promise<readonly ToolStatus[]>;
  readonly getToolPath: (name: string) => string | null;
  readonly isUvAvailable: () => Promise<boolean>;
}

/** Default tools dir — user-level, shared across projects, complior-scoped. */
export const DEFAULT_TOOLS_DIR = resolve(homedir(), '.complior', 'tools');

/** Create a process runner that passes UV_TOOL_DIR so uv installs to ~/.complior/tools/. */
const createUvProcessRunner = (toolsDir: string): ProcessRunner => (cmd, args, options) => {
  return new Promise((resolve) => {
    execFile(cmd, [...args], {
      timeout: options?.timeout ?? 60_000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, UV_TOOL_DIR: toolsDir },
    }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: error ? (error as NodeJS.ErrnoException & { code?: number }).code === 'ENOENT' ? 127 : (error as { code?: number }).code ?? 1 : 0,
      });
    });
  });
};

export const createToolManager = (
  toolsDir?: string,
  runProcess?: ProcessRunner,
): ToolManager => {
  const dir = toolsDir ?? DEFAULT_TOOLS_DIR;
  const run = runProcess ?? createUvProcessRunner(dir);
  const installedPaths = new Map<string, string>();
  let toolVersions: Record<string, ToolVersionEntry> | null = null;

  const loadVersions = async (): Promise<Record<string, ToolVersionEntry>> => {
    if (toolVersions) return toolVersions;
    const raw = await readFile(TOOL_VERSIONS_PATH, 'utf-8');
    toolVersions = JSON.parse(raw) as Record<string, ToolVersionEntry>;
    return toolVersions;
  };

  const isUvAvailable = async (): Promise<boolean> => {
    const result = await run('uv', ['--version'], { timeout: 5000 });
    return result.exitCode === 0;
  };

  const checkInstalled = async (name: string, versions: Record<string, ToolVersionEntry>): Promise<ToolStatus> => {
    const entry = versions[name];
    if (!entry) {
      return { name, installed: false, expectedVersion: 'unknown', error: `Unknown tool: ${name}` };
    }

    // Check if uv tool is installed — `uv tool run <pkg> --version`
    const result = await run('uv', ['tool', 'run', entry.package, '--version'], { timeout: 15_000 });
    if (result.exitCode === 0) {
      // Extract semver from potentially verbose output (e.g. "bandit 1.7.8\n  python version = ...")
      const semverMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
      const version = semverMatch?.[1] ?? result.stdout.trim().split('\n')[0]?.trim() ?? '';
      // Try to find the tool path
      const whichResult = await run('uv', ['tool', 'run', '--', 'which', entry.package], { timeout: 5000 });
      const toolPath = whichResult.exitCode === 0 ? whichResult.stdout.trim() : undefined;
      if (toolPath) installedPaths.set(name, toolPath);
      return { name, installed: true, version, expectedVersion: entry.version, path: toolPath };
    }

    return { name, installed: false, expectedVersion: entry.version };
  };

  const installTool = async (name: string, versions: Record<string, ToolVersionEntry>): Promise<ToolStatus> => {
    const entry = versions[name];
    if (!entry) {
      return { name, installed: false, expectedVersion: 'unknown', error: `Unknown tool: ${name}` };
    }

    // Ensure tools directory exists
    await mkdir(dir, { recursive: true });

    // Install via uv tool install
    const result = await run('uv', [
      'tool', 'install',
      `${entry.package}==${entry.version}`,
    ], { timeout: 120_000 });

    if (result.exitCode !== 0) {
      // Check if already installed (uv returns non-zero if already installed)
      if (result.stderr.includes('already installed') || result.stderr.includes('is already available')) {
        return checkInstalled(name, versions);
      }
      return {
        name,
        installed: false,
        expectedVersion: entry.version,
        error: `Install failed: ${result.stderr.slice(0, 200)}`,
      };
    }

    return checkInstalled(name, versions);
  };

  const ensureTools = async (tools: readonly string[]): Promise<readonly ToolStatus[]> => {
    const versions = await loadVersions();

    // Check if uv is available
    const uvOk = await isUvAvailable();
    if (!uvOk) {
      return tools.map((name) => ({
        name,
        installed: false,
        expectedVersion: versions[name]?.version ?? 'unknown',
        error: 'uv not available — install with: curl -LsSf https://astral.sh/uv/install.sh | sh',
      }));
    }

    const results: ToolStatus[] = [];
    for (const name of tools) {
      const status = await checkInstalled(name, versions);
      if (status.installed) {
        results.push(status);
      } else {
        results.push(await installTool(name, versions));
      }
    }
    return results;
  };

  const getToolStatus = async (): Promise<readonly ToolStatus[]> => {
    const versions = await loadVersions();
    const uvOk = await isUvAvailable();
    if (!uvOk) {
      return Object.keys(versions).map((name) => ({
        name,
        installed: false,
        expectedVersion: versions[name]!.version,
        error: 'uv not available',
      }));
    }

    return Promise.all(
      Object.keys(versions).map((name) => checkInstalled(name, versions)),
    );
  };

  const updateTools = async (): Promise<readonly ToolStatus[]> => {
    const versions = await loadVersions();
    const uvOk = await isUvAvailable();
    if (!uvOk) {
      return Object.keys(versions).map((name) => ({
        name,
        installed: false,
        expectedVersion: versions[name]!.version,
        error: 'uv not available',
      }));
    }

    return Promise.all(
      Object.keys(versions).map((name) => installTool(name, versions)),
    );
  };

  const getToolPath = (name: string): string | null => {
    return installedPaths.get(name) ?? null;
  };

  return Object.freeze({ ensureTools, getToolStatus, updateTools, getToolPath, isUvAvailable });
};
