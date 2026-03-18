import { describe, it, expect } from 'vitest';
import { parseDetectSecretsOutput } from './detect-secrets-runner.js';

describe('parseDetectSecretsOutput', () => {
  it('parses valid detect-secrets JSON output', () => {
    const output = JSON.stringify({
      version: '1.4.0',
      results: {
        '/project/config.js': [
          {
            type: 'Hex High Entropy String',
            line_number: 5,
            hashed_secret: 'abc123',
            is_verified: false,
          },
        ],
        '/project/src/api.ts': [
          {
            type: 'Base64 High Entropy String',
            line_number: 12,
            hashed_secret: 'def456',
            is_verified: true,
          },
          {
            type: 'Private Key',
            line_number: 20,
            hashed_secret: 'ghi789',
            is_verified: false,
          },
        ],
      },
    });

    const findings = parseDetectSecretsOutput(output, '/project');
    expect(findings).toHaveLength(3);

    expect(findings[0]!.ruleId).toBe('Hex High Entropy String');
    expect(findings[0]!.file).toBe('config.js');
    expect(findings[0]!.line).toBe(5);
    expect(findings[0]!.message).not.toContain('verified');

    expect(findings[1]!.ruleId).toBe('Base64 High Entropy String');
    expect(findings[1]!.file).toBe('src/api.ts');
    expect(findings[1]!.message).toContain('verified');

    expect(findings[2]!.file).toBe('src/api.ts');
    expect(findings[2]!.line).toBe(20);
  });

  it('returns empty array for empty output', () => {
    expect(parseDetectSecretsOutput('', '/project')).toEqual([]);
  });

  it('returns empty array for empty results', () => {
    const output = JSON.stringify({ version: '1.4.0', results: {} });
    expect(parseDetectSecretsOutput(output, '/project')).toEqual([]);
  });
});
