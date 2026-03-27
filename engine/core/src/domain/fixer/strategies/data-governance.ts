import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

// --- Strategy: Data Governance (Art. 10) ---

export const dataGovernanceStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-data-governance') return null;

  const filePath = 'src/middleware/data-governance.ts';
  const content = `// Data Governance Middleware (EU AI Act, Art. 10)
// Input validation, PII detection, and data quality checks

export interface DataQualityReport {
  readonly timestamp: string;
  readonly inputSize: number;
  readonly piiDetected: boolean;
  readonly validationPassed: boolean;
  readonly issues: string[];
}

const PII_PATTERNS = [
  /\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b/i,
  /\\b\\d{3}-\\d{2}-\\d{4}\\b/,
  /\\b\\d{16}\\b/,
];

export const detectPII = (text: string): boolean =>
  PII_PATTERNS.some((p) => p.test(text));

export const validateInput = (input: string): DataQualityReport => {
  const issues: string[] = [];
  if (!input.trim()) issues.push('Empty input');
  if (input.length > 100_000) issues.push('Input exceeds maximum length');
  const piiDetected = detectPII(input);
  if (piiDetected) issues.push('PII detected in input');
  return {
    timestamp: new Date().toISOString(),
    inputSize: input.length,
    piiDetected,
    validationPassed: issues.length === 0,
    issues,
  };
};
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create data governance middleware with PII detection',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-004',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 10',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add data governance middleware (Art. 10) -- via Complior',
    description: 'Add data governance middleware with input validation and PII detection',
  };
};
