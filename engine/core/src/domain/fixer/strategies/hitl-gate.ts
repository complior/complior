import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

// --- Strategy: HITL Gate / Conformity Assessment (Art. 19) ---

export const hitlGateStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-conformity-assessment') return null;

  const filePath = 'src/compliance/conformity-checklist.ts';
  const content = `// Conformity Assessment Checklist (EU AI Act, Art. 19)
// Pre-deployment verification for high-risk AI systems

export type ConformityStatus = 'pending' | 'passed' | 'failed' | 'waived';

export interface ChecklistItem {
  readonly id: string;
  readonly category: string;
  readonly requirement: string;
  status: ConformityStatus;
  signedOffBy?: string;
  signedOffAt?: string;
}

export const CONFORMITY_CHECKLIST: ChecklistItem[] = [
  { id: 'CA-01', category: 'Risk Assessment', requirement: 'Risk management system established (Art. 9)', status: 'pending' },
  { id: 'CA-02', category: 'Data Governance', requirement: 'Training data quality verified (Art. 10)', status: 'pending' },
  { id: 'CA-03', category: 'Documentation', requirement: 'Technical documentation complete (Art. 11)', status: 'pending' },
  { id: 'CA-04', category: 'Logging', requirement: 'Automatic logging enabled (Art. 12)', status: 'pending' },
  { id: 'CA-05', category: 'Transparency', requirement: 'User instructions provided (Art. 13)', status: 'pending' },
  { id: 'CA-06', category: 'Human Oversight', requirement: 'Human oversight measures in place (Art. 14)', status: 'pending' },
  { id: 'CA-07', category: 'Accuracy', requirement: 'Accuracy and robustness tested (Art. 15)', status: 'pending' },
  { id: 'CA-08', category: 'Sign-off', requirement: 'Authorized representative sign-off', status: 'pending' },
];

export const signOff = (id: string, by: string): boolean => {
  const item = CONFORMITY_CHECKLIST.find((c) => c.id === id);
  if (!item) return false;
  item.status = 'passed';
  item.signedOffBy = by;
  item.signedOffAt = new Date().toISOString();
  return true;
};

export const isConformityComplete = (): boolean =>
  CONFORMITY_CHECKLIST.every((c) => c.status === 'passed' || c.status === 'waived');
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create conformity assessment checklist for pre-deployment verification',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-011',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 19',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add conformity assessment checklist (Art. 19) -- via Complior',
    description: 'Add pre-deployment conformity assessment checklist for high-risk AI systems',
  };
};
