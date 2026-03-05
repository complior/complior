import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvidenceStore } from './evidence-store.js';
import type { Evidence } from './evidence.js';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
}));

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);
const mockStat = vi.mocked(stat);

const signHash = (hash: string): string => `sig:${hash.slice(0, 8)}`;
const verifyHash = (hash: string, signature: string): boolean => signature === `sig:${hash.slice(0, 8)}`;

const createTestEvidence = (findingId: string, layer = 'L1'): Evidence => ({
  findingId,
  layer,
  timestamp: '2026-01-01T00:00:00.000Z',
  source: 'file-presence',
  snippet: `check ${findingId}`,
});

describe('createEvidenceStore', () => {
  const storePath = '/project/.complior/evidence/chain.json';

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    // Default: file doesn't exist (stat throws)
    mockStat.mockRejectedValue(new Error('ENOENT'));
  });

  it('starts with empty chain when no file exists', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    const chain = await store.getChain();

    expect(chain.version).toBe('1.0.0');
    expect(chain.entries).toHaveLength(0);
    expect(chain.lastHash).toBe('');
  });

  it('appends evidence entries with chain linking', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);

    const evidence = [createTestEvidence('f1'), createTestEvidence('f2')];
    await store.append(evidence, 'scan-001');

    const chain = await store.getChain();
    expect(chain.entries).toHaveLength(2);

    // First entry has null prev
    expect(chain.entries[0]!.chainPrev).toBeNull();
    // Second entry links to first
    expect(chain.entries[1]!.chainPrev).toBe(chain.entries[0]!.hash);
    // Last hash matches last entry
    expect(chain.lastHash).toBe(chain.entries[1]!.hash);
  });

  it('signs each entry hash', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    await store.append([createTestEvidence('f1')], 'scan-001');

    const chain = await store.getChain();
    const entry = chain.entries[0]!;
    expect(entry.signature).toBe(`sig:${entry.hash.slice(0, 8)}`);
  });

  it('persists chain to disk after append', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    await store.append([createTestEvidence('f1')], 'scan-001');

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledWith(
      storePath,
      expect.any(String),
    );

    // Verify written JSON is valid
    const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
    expect(written.version).toBe('1.0.0');
    expect(written.entries).toHaveLength(1);
  });

  it('loads existing chain from disk', async () => {
    const existing = {
      version: '1.0.0',
      projectPath: '/project',
      entries: [{
        evidence: createTestEvidence('f1'),
        scanId: 'scan-001',
        chainPrev: null,
        hash: 'abc123',
        signature: 'sig:abc12345',
      }],
      lastHash: 'abc123',
    };
    mockStat.mockResolvedValue({ size: 500 } as any);
    mockReadFile.mockResolvedValue(JSON.stringify(existing));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    const chain = await store.getChain();

    expect(chain.entries).toHaveLength(1);
    expect(chain.lastHash).toBe('abc123');
  });

  it('verifies a valid chain', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    await store.append([createTestEvidence('f1'), createTestEvidence('f2')], 'scan-001');

    const result = await store.verify();
    expect(result.valid).toBe(true);
    expect(result.brokenAt).toBeUndefined();
  });

  it('verifies empty chain as valid', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    const result = await store.verify();
    expect(result.valid).toBe(true);
  });

  it('detects tampered hash', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    await store.append([createTestEvidence('f1')], 'scan-001');

    // Tamper with the stored chain by loading and modifying
    const chain = await store.getChain();
    const tamperedEntries = [...chain.entries];
    tamperedEntries[0] = { ...tamperedEntries[0]!, hash: 'tampered' };

    // Create a new store that loads the tampered data
    mockStat.mockResolvedValue({ size: 500 } as any);
    mockReadFile.mockResolvedValue(JSON.stringify({
      ...chain,
      entries: tamperedEntries,
      lastHash: 'tampered',
    }));

    const store2 = createEvidenceStore(storePath, signHash, verifyHash);
    const result = await store2.verify();
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it('returns summary with counts', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    await store.append([createTestEvidence('f1'), createTestEvidence('f2')], 'scan-001');
    await store.append([createTestEvidence('f1')], 'scan-002');

    const summary = await store.getSummary();
    expect(summary.totalEntries).toBe(3);
    expect(summary.scanCount).toBe(2);
    expect(summary.uniqueFindings).toBe(2);
    expect(summary.chainValid).toBe(true);
    expect(summary.firstEntry).toBe('2026-01-01T00:00:00.000Z');
    expect(summary.lastEntry).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns empty summary for empty chain', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    const summary = await store.getSummary();

    expect(summary.totalEntries).toBe(0);
    expect(summary.scanCount).toBe(0);
    expect(summary.firstEntry).toBe('');
    expect(summary.lastEntry).toBe('');
    expect(summary.chainValid).toBe(true);
  });

  it('continues chain across multiple appends', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const store = createEvidenceStore(storePath, signHash, verifyHash);
    await store.append([createTestEvidence('f1')], 'scan-001');
    await store.append([createTestEvidence('f2')], 'scan-002');

    const chain = await store.getChain();
    expect(chain.entries).toHaveLength(2);
    // Second entry's prev should be first entry's hash
    expect(chain.entries[1]!.chainPrev).toBe(chain.entries[0]!.hash);
  });
});
