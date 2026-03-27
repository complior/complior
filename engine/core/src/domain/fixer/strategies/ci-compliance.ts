import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

// --- Strategy: CI Compliance (Art. 17) ---

export const ciComplianceStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l3-ci-compliance') return null;

  const filePath = '.github/workflows/compliance-check.yml';
  const content = `name: Compliance Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Run Complior scan
        run: npx complior scan --ci --threshold 70

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: complior-report.sarif
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create GitHub Actions compliance check workflow',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-010',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 17',
    fixType: 'config_fix',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 4,
    commitMessage: 'fix: add CI compliance check workflow (Art. 17) -- via Complior',
    description: 'Add GitHub Actions workflow for automated compliance scanning',
  };
};
