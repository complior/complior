import { describe, it, expect } from 'vitest';
import { loadProjectConfig, getSelectedFrameworks } from './project-config.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const createTmpDir = async () => {
  const dir = resolve(tmpdir(), `complior-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(resolve(dir, '.complior'), { recursive: true });
  return dir;
};

describe('ProjectConfig', () => {
  it('returns default config when no file exists', async () => {
    const config = await loadProjectConfig('/nonexistent-path-12345');
    expect(config.compliance.frameworks).toEqual(['eu-ai-act']);
  });

  it('loads config from .complior/config.json', async () => {
    const dir = await createTmpDir();
    try {
      await writeFile(
        resolve(dir, '.complior', 'config.json'),
        JSON.stringify({ compliance: { frameworks: ['eu-ai-act', 'aiuc-1'] } }),
      );
      const config = await loadProjectConfig(dir);
      expect(config.compliance.frameworks).toEqual(['eu-ai-act', 'aiuc-1']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('falls back to default on invalid JSON', async () => {
    const dir = await createTmpDir();
    try {
      await writeFile(resolve(dir, '.complior', 'config.json'), 'not valid json');
      const config = await loadProjectConfig(dir);
      expect(config.compliance.frameworks).toEqual(['eu-ai-act']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('uses defaults for missing fields', async () => {
    const dir = await createTmpDir();
    try {
      await writeFile(resolve(dir, '.complior', 'config.json'), '{}');
      const config = await loadProjectConfig(dir);
      expect(config.compliance.frameworks).toEqual(['eu-ai-act']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('getSelectedFrameworks returns frameworks array', () => {
    const config = { compliance: { frameworks: ['a', 'b'] } };
    expect(getSelectedFrameworks(config)).toEqual(['a', 'b']);
  });

  it('rejects empty frameworks array', async () => {
    const dir = await createTmpDir();
    try {
      await writeFile(
        resolve(dir, '.complior', 'config.json'),
        JSON.stringify({ compliance: { frameworks: [] } }),
      );
      // Zod should reject empty array, fallback to default
      const config = await loadProjectConfig(dir);
      expect(config.compliance.frameworks).toEqual(['eu-ai-act']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
