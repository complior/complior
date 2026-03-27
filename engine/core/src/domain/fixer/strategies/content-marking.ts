import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const contentMarkingStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'content-marking') return null;

  const configPath = 'complior-content-marking.json';
  const content = JSON.stringify({
    version: '1.0',
    standard: 'C2PA',
    marking: {
      enabled: true,
      method: 'metadata',
      fields: {
        'dc:creator': 'AI-generated',
        'ai:model': '[PASSPORT:model.model_id]',
        'ai:provider': '[PASSPORT:model.provider]',
        'xmp:CreatorTool': 'Complior Content Marking',
      },
    },
    iptc: {
      'Iptc4xmpExt:DigitalSourceType': 'trainedAlgorithmicMedia',
    },
  }, null, 2);

  const action: FixAction = {
    type: 'create',
    path: configPath,
    content,
    description: 'Create C2PA/IPTC content marking configuration',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-016',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 50(2)',
    fixType: 'config_fix',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(configPath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add C2PA content marking config (Art. 50.2) -- via Complior',
    description: 'Add C2PA/IPTC content marking configuration for AI-generated content',
  };
};
