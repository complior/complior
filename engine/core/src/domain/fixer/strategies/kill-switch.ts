import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const killSwitchStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-kill-switch') return null;

  const filePath = 'src/safety/kill-switch.ts';
  const content = `// AI Kill Switch (EU AI Act, Art. 14.4)
// Emergency shutdown capability for AI system

const AI_KILL_SWITCH_ENV = 'AI_KILL_SWITCH';

export const isAiEnabled = (): boolean => {
  const val = process.env[AI_KILL_SWITCH_ENV];
  return val !== '1' && val !== 'true';
};

export const emergencyShutdown = (reason: string): void => {
  process.env[AI_KILL_SWITCH_ENV] = '1';
  console.error(\`[KILL-SWITCH] AI system disabled: \${reason}\`);
};

export const restoreService = (): void => {
  delete process.env[AI_KILL_SWITCH_ENV];
  console.info('[KILL-SWITCH] AI system re-enabled');
};

export const withKillSwitch = <T>(fn: () => T, fallback: T): T => {
  if (!isAiEnabled()) return fallback;
  return fn();
};
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create AI kill switch for emergency shutdown',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-006',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 14(4)',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add AI kill switch (Art. 14.4) -- via Complior',
    description: 'Add emergency kill switch to disable AI system immediately',
  };
};
