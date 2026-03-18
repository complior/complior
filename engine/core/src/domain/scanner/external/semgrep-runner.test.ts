import { describe, it, expect } from 'vitest';
import { parseSemgrepOutput } from './semgrep-runner.js';

describe('parseSemgrepOutput', () => {
  it('parses valid Semgrep JSON output', () => {
    const output = JSON.stringify({
      results: [
        {
          check_id: 'complior.bare-call',
          path: '/project/src/ai.ts',
          start: { line: 42, col: 5 },
          end: { line: 42, col: 30 },
          extra: {
            message: 'Bare LLM API call without compliance wrapper',
            severity: 'ERROR',
          },
        },
        {
          check_id: 'complior.unsafe-deser',
          path: '/project/loader.py',
          start: { line: 10, col: 1 },
          end: { line: 10, col: 50 },
          extra: {
            message: 'Unsafe deserialization detected',
            severity: 'ERROR',
          },
        },
      ],
    });

    const findings = parseSemgrepOutput(output, '/project');
    expect(findings).toHaveLength(2);
    expect(findings[0]!.ruleId).toBe('complior.bare-call');
    expect(findings[0]!.file).toBe('src/ai.ts');
    expect(findings[0]!.line).toBe(42);
    expect(findings[0]!.severity).toBe('ERROR');
    expect(findings[1]!.ruleId).toBe('complior.unsafe-deser');
    expect(findings[1]!.file).toBe('loader.py');
  });

  it('returns empty array for empty output', () => {
    expect(parseSemgrepOutput('', '/project')).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseSemgrepOutput('not json', '/project')).toEqual([]);
  });

  it('returns empty array when no results key', () => {
    expect(parseSemgrepOutput('{}', '/project')).toEqual([]);
  });
});
