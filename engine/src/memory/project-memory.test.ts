import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createProjectMemoryManager } from './project-memory.js';
import type { ScanRecord, FixRecord } from '../types/common.types.js';

describe('createProjectMemoryManager', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'complior-memory-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('creates a new empty memory object', () => {
      const manager = createProjectMemoryManager(tempDir);
      const memory = manager.initialize('/test/project');

      expect(memory.version).toBe('1.0.0');
      expect(memory.projectPath).toBe('/test/project');
      expect(memory.scanHistory).toHaveLength(0);
      expect(memory.fixHistory).toHaveLength(0);
      expect(memory.createdAt).toBeDefined();
      expect(memory.updatedAt).toBeDefined();
    });
  });

  describe('save and load', () => {
    it('saves and loads memory round-trip', async () => {
      const manager = createProjectMemoryManager(tempDir);
      const memory = manager.initialize('/test/project');

      await manager.save(memory);
      const loaded = await manager.load();

      expect(loaded).not.toBeNull();
      expect(loaded?.projectPath).toBe('/test/project');
      expect(loaded?.version).toBe('1.0.0');
    });

    it('returns null when no file exists', async () => {
      const manager = createProjectMemoryManager(join(tempDir, 'nonexistent'));
      const result = await manager.load();

      expect(result).toBeNull();
    });

    it('saves as valid JSON', async () => {
      const manager = createProjectMemoryManager(tempDir);
      const memory = manager.initialize('/test/project');
      await manager.save(memory);

      const content = await readFile(join(tempDir, 'memory.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe('1.0.0');
    });

    it('creates directory if it does not exist', async () => {
      const nestedDir = join(tempDir, 'deep', 'nested', '.complior');
      const manager = createProjectMemoryManager(nestedDir);
      const memory = manager.initialize('/test/project');

      await manager.save(memory);
      const loaded = await manager.load();

      expect(loaded).not.toBeNull();
    });
  });

  describe('recordScan', () => {
    it('appends scan to history', () => {
      const manager = createProjectMemoryManager(tempDir);
      const memory = manager.initialize('/test/project');

      const scan: ScanRecord = {
        score: 85,
        zone: 'green',
        findingsCount: 3,
        criticalCount: 0,
        timestamp: new Date().toISOString(),
      };

      const updated = manager.recordScan(memory, scan);

      expect(updated.scanHistory).toHaveLength(1);
      expect(updated.scanHistory[0]?.score).toBe(85);
    });

    it('does not mutate original memory', () => {
      const manager = createProjectMemoryManager(tempDir);
      const memory = manager.initialize('/test/project');

      const scan: ScanRecord = {
        score: 85,
        zone: 'green',
        findingsCount: 3,
        criticalCount: 0,
        timestamp: new Date().toISOString(),
      };

      manager.recordScan(memory, scan);

      expect(memory.scanHistory).toHaveLength(0);
    });
  });

  describe('recordFix', () => {
    it('appends fix to history', () => {
      const manager = createProjectMemoryManager(tempDir);
      const memory = manager.initialize('/test/project');

      const fix: FixRecord = {
        checkId: 'CHECK-001',
        file: 'src/index.ts',
        timestamp: new Date().toISOString(),
        scoreBefore: 70,
        scoreAfter: 80,
      };

      const updated = manager.recordFix(memory, fix);

      expect(updated.fixHistory).toHaveLength(1);
      expect(updated.fixHistory[0]?.checkId).toBe('CHECK-001');
    });

    it('does not mutate original memory', () => {
      const manager = createProjectMemoryManager(tempDir);
      const memory = manager.initialize('/test/project');

      const fix: FixRecord = {
        checkId: 'CHECK-001',
        file: 'src/index.ts',
        timestamp: new Date().toISOString(),
        scoreBefore: 70,
        scoreAfter: 80,
      };

      manager.recordFix(memory, fix);

      expect(memory.fixHistory).toHaveLength(0);
    });
  });
});
