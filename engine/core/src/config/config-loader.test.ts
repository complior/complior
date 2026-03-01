import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from './config-loader.js';

describe('loadConfig', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'complior-config-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig(tempDir);

    expect(config.extends).toEqual(['complior:eu-ai-act']);
    expect(config.exclude).toEqual(['node_modules', '.git', 'dist', 'build']);
    expect(config.severity).toBe('low');
    expect(config.outputFormat).toBe('json');
  });

  it('loads .compliorrc.json config', async () => {
    await writeFile(
      join(tempDir, '.compliorrc.json'),
      JSON.stringify({ severity: 'high', outputFormat: 'sarif' }),
    );

    const config = await loadConfig(tempDir);

    expect(config.severity).toBe('high');
    expect(config.outputFormat).toBe('sarif');
    expect(config.extends).toEqual(['complior:eu-ai-act']); // default kept
  });

  it('merges custom exclude with defaults for unset fields', async () => {
    await writeFile(
      join(tempDir, '.compliorrc.json'),
      JSON.stringify({ exclude: ['custom-dir'] }),
    );

    const config = await loadConfig(tempDir);

    expect(config.exclude).toEqual(['custom-dir']);
    expect(config.severity).toBe('low'); // default
  });

  it('uses searchFrom as projectPath when not specified in config', async () => {
    const config = await loadConfig(tempDir);

    expect(config.projectPath).toBe(tempDir);
  });

  it('rejects invalid severity values', async () => {
    await writeFile(
      join(tempDir, '.compliorrc.json'),
      JSON.stringify({ severity: 'invalid-value' }),
    );

    await expect(loadConfig(tempDir)).rejects.toThrow();
  });

  it('rejects invalid outputFormat values', async () => {
    await writeFile(
      join(tempDir, '.compliorrc.json'),
      JSON.stringify({ outputFormat: 'xml' }),
    );

    await expect(loadConfig(tempDir)).rejects.toThrow();
  });
});
