import { describe, it, expect } from 'vitest';
import { MCP_TOOL_SCHEMAS } from './tools.js';
import { createMcpHandlers } from './handlers.js';
import type { ScanResult, ScoreBreakdown } from '../types/common.types.js';

const makeScore = (): ScoreBreakdown => ({
  totalScore: 42,
  zone: 'red',
  categoryScores: [{ category: 'Transparency', weight: 17, score: 30, obligationCount: 6, passedCount: 2 }],
  criticalCapApplied: false,
  totalChecks: 10,
  passedChecks: 4,
  failedChecks: 5,
  skippedChecks: 1,
});

const makeScanResult = (): ScanResult => ({
  score: makeScore(),
  findings: [
    { checkId: 'ai-disclosure', type: 'fail', message: 'No disclosure', severity: 'high', articleReference: 'Art. 50(1)' },
    { checkId: 'docs', type: 'pass', message: 'OK', severity: 'info' },
  ],
  projectPath: '/test',
  scannedAt: '2026-01-01T00:00:00Z',
  duration: 100,
  filesScanned: 50,
});

const mockHandlers = createMcpHandlers({
  scanService: { scan: async () => makeScanResult() } as any,
  fixService: { preview: () => null, applyFix: async () => ({}) } as any,
  getProjectPath: () => '/test',
  getLastScanResult: () => makeScanResult(),
  getRegulationData: () => ({ obligations: { obligations: [{ id: 'OBL-001', article: 'Art. 4', title: 'AI Literacy', description: 'Test', severity: 'high', deadline: '2025-02-02', role: 'both' }] }, scoring: {} }) as any,
  version: '0.1.0',
});

describe('MCP Tool Schemas', () => {
  it('defines all 7 tools', () => {
    const names = Object.keys(MCP_TOOL_SCHEMAS);
    expect(names).toHaveLength(7);
    expect(names).toContain('complior_scan');
    expect(names).toContain('complior_fix');
    expect(names).toContain('complior_status');
    expect(names).toContain('complior_explain');
    expect(names).toContain('complior_search_tool');
    expect(names).toContain('complior_classify');
    expect(names).toContain('complior_report');
  });
});

describe('MCP Handlers', () => {
  it('complior_scan returns score and findings', async () => {
    const result = await mockHandlers.complior_scan({});
    const data = JSON.parse(result.content[0].text);
    expect(data.score).toBe(42);
    expect(data.violations).toBe(1);
    expect(data.topFindings).toHaveLength(1);
  });

  it('complior_status returns category breakdown', async () => {
    const result = await mockHandlers.complior_status();
    const data = JSON.parse(result.content[0].text);
    expect(data.score).toBe(42);
    expect(data.categories).toHaveLength(1);
  });

  it('complior_classify returns risk level', async () => {
    const result = await mockHandlers.complior_classify({ description: 'HR recruitment screening tool', domain: 'hr' });
    const data = JSON.parse(result.content[0].text);
    expect(data.riskLevel).toBe('high');
    expect(data.reason).toContain('HR');
  });

  it('complior_fix returns error for unknown finding', async () => {
    const result = await mockHandlers.complior_fix({ checkId: 'unknown' });
    expect(result.isError).toBe(true);
  });
});
