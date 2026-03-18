import { describe, it, expect } from 'vitest';
import { parseModelScanOutput } from './modelscan-runner.js';

describe('parseModelScanOutput', () => {
  it('parses valid ModelScan JSON output', () => {
    const output = JSON.stringify({
      summary: {
        total_issues_by_severity: { CRITICAL: 1 },
      },
      issues: [
        {
          severity: 'CRITICAL',
          description: 'Unsafe pickle deserialization detected — arbitrary code execution possible',
          source: '/project/models/classifier.pkl',
          scanner: 'pickle',
        },
      ],
    });

    const findings = parseModelScanOutput(output, '/project');
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('modelscan-pickle');
    expect(findings[0]!.file).toBe('models/classifier.pkl');
    expect(findings[0]!.severity).toBe('CRITICAL');
  });

  it('returns empty array for empty output', () => {
    expect(parseModelScanOutput('', '/project')).toEqual([]);
  });

  it('returns empty array when no issues', () => {
    const output = JSON.stringify({ summary: {}, issues: [] });
    expect(parseModelScanOutput(output, '/project')).toEqual([]);
  });
});
