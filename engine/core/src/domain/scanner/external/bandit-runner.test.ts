import { describe, it, expect } from 'vitest';
import { parseBanditOutput } from './bandit-runner.js';

describe('parseBanditOutput', () => {
  it('parses valid Bandit JSON output', () => {
    const output = JSON.stringify({
      results: [
        {
          test_id: 'B603',
          test_name: 'subprocess_without_shell_equals_true',
          issue_text: 'subprocess call - check for execution of untrusted input',
          issue_severity: 'HIGH',
          issue_confidence: 'HIGH',
          filename: '/project/scripts/run.py',
          line_number: 15,
        },
        {
          test_id: 'B101',
          test_name: 'assert_used',
          issue_text: 'Use of assert detected. The enclosed code will be removed when compiling to optimised byte code.',
          issue_severity: 'LOW',
          issue_confidence: 'HIGH',
          filename: '/project/tests/test_app.py',
          line_number: 3,
        },
      ],
    });

    const findings = parseBanditOutput(output, '/project');
    expect(findings).toHaveLength(2);
    expect(findings[0]!.ruleId).toBe('B603');
    expect(findings[0]!.file).toBe('scripts/run.py');
    expect(findings[0]!.severity).toBe('HIGH');
    expect(findings[0]!.line).toBe(15);
    expect(findings[1]!.severity).toBe('LOW');
  });

  it('returns empty array for empty output', () => {
    expect(parseBanditOutput('', '/project')).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseBanditOutput('syntax error', '/project')).toEqual([]);
  });
});
