import { describe, it, expect } from 'vitest';
import { gitHistoryToCheckResults } from './git-history.js';
import type { GitHistoryResult } from './git-history.js';

describe('gitHistoryToCheckResults', () => {
  it('marks fresh documents as pass', () => {
    const result: GitHistoryResult = {
      fileHistories: [{
        relativePath: 'docs/fria.md',
        created: new Date(Date.now() - 30 * 86400000).toISOString(),
        lastModified: new Date(Date.now() - 10 * 86400000).toISOString(),
        commitCount: 5,
        authors: ['Alice', 'Bob'],
        daysSinceLastModified: 10,
      }],
      bulkCommits: [],
    };

    const checks = gitHistoryToCheckResults(result);
    expect(checks.some((c) => c.type === 'pass' && c.checkId.includes('freshness'))).toBe(true);
  });

  it('warns about stale documents (>90 days)', () => {
    const result: GitHistoryResult = {
      fileHistories: [{
        relativePath: 'docs/risk-management.md',
        created: new Date(Date.now() - 200 * 86400000).toISOString(),
        lastModified: new Date(Date.now() - 120 * 86400000).toISOString(),
        commitCount: 2,
        authors: ['Alice'],
        daysSinceLastModified: 120,
      }],
      bulkCommits: [],
    };

    const checks = gitHistoryToCheckResults(result);
    const stale = checks.find((c) => c.type === 'fail' && c.checkId.includes('freshness'));
    expect(stale).toBeDefined();
    expect(stale?.severity).toBe('low');
  });

  it('fails for very stale documents (>180 days)', () => {
    const result: GitHistoryResult = {
      fileHistories: [{
        relativePath: 'docs/data-governance.md',
        created: new Date(Date.now() - 365 * 86400000).toISOString(),
        lastModified: new Date(Date.now() - 200 * 86400000).toISOString(),
        commitCount: 1,
        authors: ['Alice'],
        daysSinceLastModified: 200,
      }],
      bulkCommits: [],
    };

    const checks = gitHistoryToCheckResults(result);
    const stale = checks.find((c) => c.type === 'fail' && c.checkId.includes('freshness'));
    expect(stale).toBeDefined();
    expect(stale?.severity).toBe('medium');
  });

  it('warns about single-author risk documents', () => {
    const result: GitHistoryResult = {
      fileHistories: [{
        relativePath: 'docs/fria.md',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        commitCount: 1,
        authors: ['Alice'],
        daysSinceLastModified: 5,
      }],
      bulkCommits: [],
    };

    const checks = gitHistoryToCheckResults(result);
    const authorCheck = checks.find((c) => c.checkId.includes('author-diversity'));
    expect(authorCheck).toBeDefined();
    expect(authorCheck?.type).toBe('fail');
  });

  it('does not warn about single author for non-risk documents', () => {
    const result: GitHistoryResult = {
      fileHistories: [{
        relativePath: 'docs/ai-literacy.md',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        commitCount: 1,
        authors: ['Alice'],
        daysSinceLastModified: 5,
      }],
      bulkCommits: [],
    };

    const checks = gitHistoryToCheckResults(result);
    const authorCheck = checks.find((c) => c.checkId.includes('author-diversity'));
    expect(authorCheck).toBeUndefined();
  });

  it('detects bulk compliance commits', () => {
    const result: GitHistoryResult = {
      fileHistories: [],
      bulkCommits: [{
        hash: 'abc1234567890',
        docCount: 5,
        date: '2026-03-01T10:00:00Z',
      }],
    };

    const checks = gitHistoryToCheckResults(result);
    const bulk = checks.find((c) => c.checkId === 'git-bulk-compliance');
    expect(bulk).toBeDefined();
    expect(bulk?.type).toBe('fail');
    expect(bulk?.message).toContain('5 documents');
  });

  it('returns empty results for no histories', () => {
    const result: GitHistoryResult = { fileHistories: [], bulkCommits: [] };
    const checks = gitHistoryToCheckResults(result);
    expect(checks).toEqual([]);
  });
});
