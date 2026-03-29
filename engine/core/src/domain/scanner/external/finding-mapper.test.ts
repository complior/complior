import { describe, it, expect } from 'vitest';
import { mapExternalFinding, mapExternalFindings } from './finding-mapper.js';
import type { RawExternalFinding } from './runner-port.js';

describe('mapExternalFinding', () => {
  it('maps a Semgrep finding with known rule to correct severity and obligation', () => {
    const raw: RawExternalFinding = {
      ruleId: 'complior.bare-call',
      message: 'Bare LLM API call without compliance wrapper',
      severity: 'ERROR',
      file: 'src/ai.ts',
      line: 42,
    };

    const finding = mapExternalFinding(raw, 'semgrep');
    expect(finding.checkId).toBe('ext-semgrep-complior-bare-call');
    expect(finding.type).toBe('info');
    expect(finding.severity).toBe('info');
    expect(finding.obligationId).toBe('OBL-015');
    expect(finding.articleReference).toBe('Art. 14');
    expect(finding.file).toBe('src/ai.ts');
    expect(finding.line).toBe(42);
  });

  it('maps a Semgrep finding with unknown rule using severity fallback', () => {
    const raw: RawExternalFinding = {
      ruleId: 'python.lang.some-rule',
      message: 'Some issue',
      severity: 'WARNING',
      file: 'app.py',
    };

    const finding = mapExternalFinding(raw, 'semgrep');
    expect(finding.checkId).toBe('ext-semgrep-python-lang-some-rule');
    expect(finding.severity).toBe('medium');
  });

  it('maps a Bandit finding with high severity', () => {
    const raw: RawExternalFinding = {
      ruleId: 'B603',
      message: 'subprocess call with shell=True',
      severity: 'HIGH',
      file: 'run.py',
      line: 10,
    };

    const finding = mapExternalFinding(raw, 'bandit');
    expect(finding.checkId).toBe('ext-bandit-B603');
    expect(finding.severity).toBe('high');
    expect(finding.obligationId).toBe('OBL-006');
  });

  it('maps a detect-secrets finding', () => {
    const raw: RawExternalFinding = {
      ruleId: 'HexHighEntropyString',
      message: 'Hex high entropy string detected',
      severity: 'high',
      file: 'config.js',
      line: 5,
    };

    const finding = mapExternalFinding(raw, 'detect-secrets');
    expect(finding.checkId).toBe('ext-detect-secrets-HexHighEntropyString');
    expect(finding.severity).toBe('high');
    expect(finding.obligationId).toBe('OBL-017');
  });

  it('maps a ModelScan finding', () => {
    const raw: RawExternalFinding = {
      ruleId: 'unsafe-pickle',
      message: 'Unsafe pickle deserialization in model file',
      severity: 'critical',
      file: 'model.pkl',
    };

    const finding = mapExternalFinding(raw, 'modelscan');
    expect(finding.checkId).toBe('ext-modelscan-unsafe-pickle');
    expect(finding.severity).toBe('critical');
    expect(finding.obligationId).toBe('OBL-006');
  });
});

describe('mapExternalFindings', () => {
  it('maps multiple findings', () => {
    const raws: RawExternalFinding[] = [
      { ruleId: 'B603', message: 'shell=True', severity: 'HIGH', file: 'a.py', line: 1 },
      { ruleId: 'B101', message: 'assert used', severity: 'LOW', file: 'b.py', line: 2 },
    ];

    const findings = mapExternalFindings(raws, 'bandit');
    expect(findings).toHaveLength(2);
    expect(findings[0]!.severity).toBe('high');
    expect(findings[1]!.severity).toBe('low');
  });
});
