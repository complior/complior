import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';
import { ENGINE_VERSION } from '../../../version.js';

export const metadataStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'compliance-metadata') return null;

  const metadataPath = '.well-known/ai-compliance.json';
  const content = JSON.stringify({
    version: '1.0',
    scanner: `complior/${ENGINE_VERSION}`,
    scannedAt: '[SCAN_DATE]',
    organization: '[PASSPORT:owner.team]',
    ai_systems: [
      {
        name: '[PASSPORT:display_name]',
        provider: '[PASSPORT:model.provider]',
        risk_level: '[PASSPORT:risk_class]',
        compliance_score: 0,
      },
    ],
    jurisdiction: 'EU',
    regulation: 'EU AI Act (Regulation (EU) 2024/1689)',
  }, null, 2);

  const action: FixAction = {
    type: 'create',
    path: metadataPath,
    content,
    description: 'Create machine-readable compliance metadata',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-021',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 50',
    fixType: 'metadata_generation',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(metadataPath, content),
    scoreImpact: 4,
    commitMessage: 'fix: add compliance metadata .well-known (Art. 50) -- via Complior',
    description: 'Create machine-readable compliance metadata for programmatic verification',
  };
};
