import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const permissionGuardStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-human-oversight') return null;

  const filePath = 'src/middleware/human-approval-gate.ts';
  const content = `// Human Approval Gate (EU AI Act, Art. 14)
// Requires human approval for high-risk AI decisions

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ApprovalRequest {
  readonly id: string;
  readonly action: string;
  readonly riskLevel: RiskLevel;
  readonly requestedAt: string;
  readonly timeoutMs: number;
}

export interface ApprovalResult {
  readonly approved: boolean;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly reason?: string;
}

const RISK_THRESHOLDS: Record<RiskLevel, boolean> = {
  low: false,
  medium: false,
  high: true,
  critical: true,
};

const pendingApprovals = new Map<string, ApprovalRequest>();

export const requiresApproval = (riskLevel: RiskLevel): boolean =>
  RISK_THRESHOLDS[riskLevel];

export const requestApproval = (action: string, riskLevel: RiskLevel, timeoutMs = 300_000): ApprovalRequest => {
  const request: ApprovalRequest = {
    id: crypto.randomUUID(),
    action,
    riskLevel,
    requestedAt: new Date().toISOString(),
    timeoutMs,
  };
  pendingApprovals.set(request.id, request);
  return request;
};

export const approveRequest = (id: string, approvedBy: string): ApprovalResult => {
  const request = pendingApprovals.get(id);
  if (!request) return { approved: false, reason: 'Request not found' };
  pendingApprovals.delete(id);
  return { approved: true, approvedBy, approvedAt: new Date().toISOString() };
};

export const rejectRequest = (id: string, reason: string): ApprovalResult => {
  pendingApprovals.delete(id);
  return { approved: false, reason };
};
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create human approval gate for high-risk AI decisions',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-006',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 14',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add human approval gate (Art. 14) -- via Complior',
    description: 'Add human-in-the-loop approval gate for high-risk AI decisions',
  };
};
