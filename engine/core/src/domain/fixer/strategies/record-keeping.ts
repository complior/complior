import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const recordKeepingStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-record-keeping') return null;

  const auditPath = 'src/compliance/audit-trail.ts';
  const content = `// Audit Trail & Record Keeping (EU AI Act, Art. 12)
// Persistent event logging for AI system compliance records

export interface AuditTrailEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly eventType: 'decision' | 'input' | 'output' | 'error' | 'override';
  readonly agentId: string;
  readonly sessionId: string;
  readonly payload: Record<string, unknown>;
  readonly retentionDays: number;
}

const complianceRecord: AuditTrailEntry[] = [];

/** Append an entry to the audit trail for compliance record keeping. */
export const persistAudit = (entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>): AuditTrailEntry => {
  const full: AuditTrailEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  complianceRecord.push(full);
  return full;
};

/** Retrieve all audit trail entries (compliance records). */
export const getAuditTrail = (): readonly AuditTrailEntry[] => [...complianceRecord];

/** Apply log retention policy — remove entries older than retentionDays. */
export const applyRetentionPolicy = (): number => {
  const now = Date.now();
  const before = complianceRecord.length;
  const keep = complianceRecord.filter((e) => {
    const age = (now - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return age <= e.retentionDays;
  });
  complianceRecord.length = 0;
  complianceRecord.push(...keep);
  return before - complianceRecord.length;
};
`;
  const action: FixAction = {
    type: 'create',
    path: auditPath,
    content,
    description: 'Create audit trail module for compliance record keeping',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-012',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 12',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(auditPath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add audit trail for record keeping (Art. 12) -- via Complior',
    description: 'Add persistent audit trail for AI system compliance records',
  };
};
