import type { ScanResult, Finding } from '../types/common.types.js';

// SARIF 2.1.0 — Static Analysis Results Interchange Format
// Compatible with GitHub Code Scanning

interface SarifResult {
  readonly ruleId: string;
  readonly level: 'error' | 'warning' | 'note' | 'none';
  readonly message: { readonly text: string };
  readonly locations?: readonly {
    readonly physicalLocation?: {
      readonly artifactLocation: { readonly uri: string };
      readonly region?: { readonly startLine: number };
    };
  }[];
}

interface SarifRun {
  readonly tool: {
    readonly driver: {
      readonly name: string;
      readonly version: string;
      readonly informationUri: string;
      readonly rules: readonly {
        readonly id: string;
        readonly shortDescription: { readonly text: string };
        readonly helpUri?: string;
      }[];
    };
  };
  readonly results: readonly SarifResult[];
}

interface SarifLog {
  readonly $schema: string;
  readonly version: string;
  readonly runs: readonly SarifRun[];
}

const severityToLevel = (severity: Finding['severity']): SarifResult['level'] => {
  switch (severity) {
    case 'critical': return 'error';
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'note';
    case 'info': return 'none';
  }
};

export const toSarif = (result: ScanResult, version: string): SarifLog => {
  const failFindings = result.findings.filter((f) => f.type === 'fail');

  // Collect unique rules
  const ruleMap = new Map<string, { id: string; description: string }>();
  for (const f of failFindings) {
    if (!ruleMap.has(f.checkId)) {
      ruleMap.set(f.checkId, {
        id: f.checkId,
        description: f.message,
      });
    }
  }

  const rules = [...ruleMap.values()].map((r) => ({
    id: r.id,
    shortDescription: { text: r.description },
    helpUri: `https://complior.ai/rules/${r.id}`,
  }));

  const results: SarifResult[] = failFindings.map((f) => {
    const sarifResult: SarifResult = {
      ruleId: f.checkId,
      level: severityToLevel(f.severity),
      message: { text: `${f.message}${f.articleReference ? ` (${f.articleReference})` : ''}` },
      ...(f.file ? {
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: f.file },
            ...(f.line ? { region: { startLine: f.line } } : {}),
          },
        }],
      } : {}),
    };
    return sarifResult;
  });

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'Complior',
          version,
          informationUri: 'https://complior.ai',
          rules,
        },
      },
      results,
    }],
  };
};
