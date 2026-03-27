import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

// --- Strategy: Bias Testing (Art. 10) ---

export const biasTestingStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l3-missing-bias-testing') return null;

  const filePath = 'bias-testing.config.json';
  const content = JSON.stringify({
    version: '1.0',
    protectedAttributes: ['gender', 'race', 'age', 'disability', 'religion', 'nationality'],
    fairnessMetrics: {
      equalized_odds: { enabled: true, threshold: 0.1 },
      demographic_parity: { enabled: true, threshold: 0.1 },
      predictive_parity: { enabled: true, threshold: 0.15 },
    },
    testDataset: {
      path: 'tests/bias/',
      format: 'jsonl',
      minSamplesPerGroup: 100,
    },
    reporting: {
      outputDir: 'reports/bias/',
      format: 'json',
      includeConfidenceIntervals: true,
    },
  }, null, 2);

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create bias testing configuration',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-004',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 10',
    fixType: 'config_fix',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 4,
    commitMessage: 'fix: add bias testing configuration (Art. 10) -- via Complior',
    description: 'Add bias testing configuration with fairness metrics and thresholds',
  };
};
