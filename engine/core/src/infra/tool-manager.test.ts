import { describe, it, expect, vi } from 'vitest';
import { createToolManager, type ProcessRunner } from './tool-manager.js';

const createMockRunner = (responses: Record<string, { stdout: string; stderr: string; exitCode: number }>): ProcessRunner => {
  return async (cmd: string, args: readonly string[]) => {
    const key = `${cmd} ${args.join(' ')}`;
    // Find matching response by prefix
    for (const [pattern, response] of Object.entries(responses)) {
      if (key.startsWith(pattern) || key.includes(pattern)) {
        return response;
      }
    }
    return { stdout: '', stderr: 'command not found', exitCode: 127 };
  };
};

describe('createToolManager', () => {
  it('reports uv not available when uv --version fails', async () => {
    const runner = createMockRunner({
      'uv --version': { stdout: '', stderr: 'not found', exitCode: 127 },
    });
    const mgr = createToolManager('/tmp/tools', runner);
    expect(await mgr.isUvAvailable()).toBe(false);
  });

  it('reports uv available when uv --version succeeds', async () => {
    const runner = createMockRunner({
      'uv --version': { stdout: 'uv 0.5.10\n', stderr: '', exitCode: 0 },
    });
    const mgr = createToolManager('/tmp/tools', runner);
    expect(await mgr.isUvAvailable()).toBe(true);
  });

  it('returns error status for all tools when uv is not available', async () => {
    const runner = createMockRunner({
      'uv --version': { stdout: '', stderr: 'not found', exitCode: 127 },
    });
    const mgr = createToolManager('/tmp/tools', runner);
    const statuses = await mgr.ensureTools(['semgrep', 'bandit']);
    expect(statuses).toHaveLength(2);
    expect(statuses[0]!.installed).toBe(false);
    expect(statuses[0]!.error).toContain('uv not available');
    expect(statuses[1]!.installed).toBe(false);
  });

  it('detects already installed tool', async () => {
    const runner = createMockRunner({
      'uv --version': { stdout: 'uv 0.5.10\n', stderr: '', exitCode: 0 },
      'uv tool run semgrep --version': { stdout: '1.67.0\n', stderr: '', exitCode: 0 },
      'uv tool run -- which semgrep': { stdout: '/home/user/.local/bin/semgrep\n', stderr: '', exitCode: 0 },
    });
    const mgr = createToolManager('/tmp/tools', runner);
    const statuses = await mgr.ensureTools(['semgrep']);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.installed).toBe(true);
    expect(statuses[0]!.version).toBe('1.67.0');
  });

  it('installs tool when not already installed', async () => {
    let installCalled = false;
    const runner: ProcessRunner = async (cmd, args) => {
      const key = `${cmd} ${args.join(' ')}`;
      if (key === 'uv --version') return { stdout: 'uv 0.5.10\n', stderr: '', exitCode: 0 };
      if (key.includes('tool run semgrep --version') && !installCalled) return { stdout: '', stderr: 'not installed', exitCode: 1 };
      if (key.includes('tool install semgrep==')) {
        installCalled = true;
        return { stdout: 'Installed semgrep\n', stderr: '', exitCode: 0 };
      }
      if (key.includes('tool run semgrep --version') && installCalled) return { stdout: '1.67.0\n', stderr: '', exitCode: 0 };
      if (key.includes('which semgrep')) return { stdout: '/home/user/.local/bin/semgrep\n', stderr: '', exitCode: 0 };
      return { stdout: '', stderr: 'unknown command', exitCode: 1 };
    };
    const mgr = createToolManager('/tmp/tools', runner);
    const statuses = await mgr.ensureTools(['semgrep']);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.installed).toBe(true);
    expect(installCalled).toBe(true);
  });

  it('getToolPath returns null for unknown tools', () => {
    const runner = createMockRunner({});
    const mgr = createToolManager('/tmp/tools', runner);
    expect(mgr.getToolPath('nonexistent')).toBeNull();
  });

  it('getToolStatus returns status for all known tools', async () => {
    const runner = createMockRunner({
      'uv --version': { stdout: 'uv 0.5.10\n', stderr: '', exitCode: 0 },
      'uv tool run': { stdout: '', stderr: 'not installed', exitCode: 1 },
    });
    const mgr = createToolManager('/tmp/tools', runner);
    const statuses = await mgr.getToolStatus();
    expect(statuses.length).toBeGreaterThanOrEqual(4);
    for (const s of statuses) {
      expect(s.name).toBeTruthy();
      expect(s.expectedVersion).toBeTruthy();
    }
  });
});
