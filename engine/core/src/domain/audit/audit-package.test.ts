import { describe, it, expect, beforeEach } from 'vitest';
import { createAuditPackage, type AuditPackageDeps } from './audit-package.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';

const createTempProject = (): string => {
  const dir = join(
    tmpdir(),
    `complior-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(dir, '.complior', 'evidence'), { recursive: true });
  mkdirSync(join(dir, '.complior', 'agents'), { recursive: true });
  return dir;
};

describe('createAuditPackage', () => {
  let testDir: string;
  let deps: AuditPackageDeps;

  beforeEach(() => {
    testDir = createTempProject();
    deps = { getProjectPath: () => testDir };
  });

  it('creates a gzipped tar archive', async () => {
    writeFileSync(join(testDir, '.complior', 'evidence', 'chain.json'), '[]');
    const { buffer } = await createAuditPackage(deps);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // Verify it's valid gzip (magic number: 1f 8b)
    expect(buffer[0]).toBe(0x1f);
    expect(buffer[1]).toBe(0x8b);
  });

  it('returns manifest with file hashes', async () => {
    writeFileSync(join(testDir, '.complior', 'evidence', 'chain.json'), '[]');
    const { manifest } = await createAuditPackage(deps);
    expect(manifest.exportDate).toBeTruthy();
    expect(manifest.toolVersion).toBe('8.0.0');
    expect(manifest.integrityHash).toBeTruthy();
    expect(manifest.files.length).toBeGreaterThanOrEqual(1);
    expect(manifest.files[0].hash).toHaveLength(64); // SHA-256
  });

  it('includes manifest in the archive', async () => {
    writeFileSync(
      join(testDir, '.complior', 'agents', 'bot-manifest.json'),
      '{}',
    );
    const { buffer, totalFiles } = await createAuditPackage(deps);
    // totalFiles includes the manifest itself
    expect(totalFiles).toBeGreaterThanOrEqual(2); // agent file + manifest
    // Decompress and verify tar contains audit-manifest.json
    const decompressed = gunzipSync(buffer);
    const content = decompressed.toString('utf8');
    expect(content).toContain('audit-manifest.json');
  });

  it('collects files from evidence directory', async () => {
    writeFileSync(
      join(testDir, '.complior', 'evidence', 'chain.json'),
      '{"entries":[]}',
    );
    const { manifest } = await createAuditPackage(deps);
    expect(manifest.files.some((f) => f.path.includes('chain.json'))).toBe(
      true,
    );
  });

  it('collects files from agents directory', async () => {
    writeFileSync(
      join(testDir, '.complior', 'agents', 'test-manifest.json'),
      '{}',
    );
    const { manifest } = await createAuditPackage(deps);
    expect(
      manifest.files.some((f) => f.path.includes('test-manifest.json')),
    ).toBe(true);
  });

  it('handles empty project gracefully', async () => {
    const emptyDir = join(tmpdir(), `complior-empty-${Date.now()}`);
    mkdirSync(emptyDir, { recursive: true });
    const emptyDeps = { getProjectPath: () => emptyDir };
    const { manifest, totalFiles } = await createAuditPackage(emptyDeps);
    // Only the manifest itself
    expect(totalFiles).toBe(1);
    expect(manifest.files.length).toBe(0); // manifest isn't in its own file list
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('computes integrity hash from file hashes', async () => {
    writeFileSync(join(testDir, '.complior', 'evidence', 'chain.json'), '[]');
    writeFileSync(
      join(testDir, '.complior', 'agents', 'bot-manifest.json'),
      '{}',
    );
    const { manifest } = await createAuditPackage(deps);
    expect(manifest.integrityHash).toHaveLength(64);
  });

  it('includes last-scan.json if present', async () => {
    writeFileSync(
      join(testDir, '.complior', 'last-scan.json'),
      '{"score":85}',
    );
    const { manifest } = await createAuditPackage(deps);
    expect(manifest.files.some((f) => f.path === 'last-scan.json')).toBe(true);
  });

  it('handles missing last-scan.json gracefully', async () => {
    const { manifest } = await createAuditPackage(deps);
    expect(manifest.files.some((f) => f.path === 'last-scan.json')).toBe(
      false,
    );
  });

  it('decompressed archive contains tar headers with complior-audit prefix', async () => {
    writeFileSync(join(testDir, '.complior', 'evidence', 'chain.json'), '[]');
    const { buffer } = await createAuditPackage(deps);
    const decompressed = gunzipSync(buffer);
    expect(decompressed.toString('utf8')).toContain('complior-audit/');
  });

  it('collects files from nested subdirectories', async () => {
    mkdirSync(join(testDir, '.complior', 'evidence', 'sub'), {
      recursive: true,
    });
    writeFileSync(
      join(testDir, '.complior', 'evidence', 'sub', 'nested.json'),
      '{}',
    );
    const { manifest } = await createAuditPackage(deps);
    expect(
      manifest.files.some((f) => f.path.includes('nested.json')),
    ).toBe(true);
  });

  it('collects files from reports directory', async () => {
    mkdirSync(join(testDir, '.complior', 'reports'), { recursive: true });
    writeFileSync(
      join(testDir, '.complior', 'reports', 'fria-bot.md'),
      '# FRIA Report',
    );
    const { manifest } = await createAuditPackage(deps);
    expect(
      manifest.files.some((f) => f.path.includes('fria-bot.md')),
    ).toBe(true);
  });
});
