import type { CheckResult } from '../../types/common.types.js';
import type { L2CheckResult } from './layers/layer2-docs.js';
import type { L3CheckResult } from './layers/layer3-config.js';
import type { L4CheckResult } from './layers/layer4-patterns.js';

export interface CrossLayerFinding {
  readonly ruleId: string;
  readonly description: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly layers: readonly string[];
  readonly obligationId?: string;
  readonly article?: string;
}

export interface CrossLayerRule {
  readonly id: string;
  readonly description: string;
  readonly check: (
    l1Results: readonly CheckResult[],
    l2Results: readonly L2CheckResult[],
    l3Results: readonly L3CheckResult[],
    l4Results: readonly L4CheckResult[],
  ) => readonly CrossLayerFinding[];
}

// Rule 1: Document says monitoring exists but no monitoring code found
const docCodeMismatch: CrossLayerRule = {
  id: 'cross-doc-code-mismatch',
  description: 'Document claims monitoring but L4 finds no monitoring patterns',
  check: (_l1, l2Results, _l3, l4Results) => {
    const findings: CrossLayerFinding[] = [];

    const hasMonitoringDoc = l2Results.some(
      (r) => r.document === 'monitoring-policy' && (r.status === 'VALID' || r.status === 'SHALLOW'),
    );
    const hasMonitoringCode = l4Results.some(
      (r) => r.category === 'deployer-monitoring' && r.status === 'FOUND',
    );

    if (hasMonitoringDoc && !hasMonitoringCode) {
      findings.push({
        ruleId: 'cross-doc-code-mismatch',
        description: 'Monitoring policy document exists but no monitoring patterns found in code. Document may be aspirational.',
        severity: 'medium',
        layers: ['L2', 'L4'],
        obligationId: 'eu-ai-act-OBL-011',
        article: 'Art. 26(5)',
      });
    }

    return findings;
  },
};

// Rule 2: AI SDK detected but no disclosure pattern
const sdkNoDisclosure: CrossLayerRule = {
  id: 'cross-sdk-no-disclosure',
  description: 'AI SDK detected in dependencies but no disclosure pattern in code',
  check: (_l1, _l2, l3Results, l4Results) => {
    const findings: CrossLayerFinding[] = [];

    const hasAiSdk = l3Results.some((r) => r.type === 'ai-sdk-detected');
    const hasDisclosure = l4Results.some(
      (r) => r.category === 'disclosure' && r.status === 'FOUND',
    );

    if (hasAiSdk && !hasDisclosure) {
      findings.push({
        ruleId: 'cross-sdk-no-disclosure',
        description: 'AI SDK detected in dependencies but no AI disclosure component found in code. Art. 50(1) requires informing users they are interacting with AI.',
        severity: 'high',
        layers: ['L3', 'L4'],
        obligationId: 'eu-ai-act-OBL-015',
        article: 'Art. 50(1)',
      });
    }

    return findings;
  },
};

// Rule 3: Banned package detected but wrapped with compliance layer → reduce severity
const bannedWithWrapper: CrossLayerRule = {
  id: 'cross-banned-with-wrapper',
  description: 'Banned package found but compliance wrapper detected — severity may be reduced',
  check: (_l1, _l2, l3Results, l4Results) => {
    const findings: CrossLayerFinding[] = [];

    const hasBanned = l3Results.some((r) => r.type === 'banned-package');
    const hasCompliance = l4Results.some(
      (r) =>
        (r.category === 'disclosure' || r.category === 'human-oversight' || r.category === 'kill-switch') &&
        r.status === 'FOUND',
    );

    if (hasBanned && hasCompliance) {
      findings.push({
        ruleId: 'cross-banned-with-wrapper',
        description: 'Prohibited package detected but compliance controls (disclosure, oversight, kill-switch) are present. Review whether usage falls under an Art. 5 exception.',
        severity: 'medium',
        layers: ['L3', 'L4'],
        article: 'Art. 5',
      });
    }

    return findings;
  },
};

// Rule 4: Logging found in code but no log retention config
const loggingNoRetention: CrossLayerRule = {
  id: 'cross-logging-no-retention',
  description: 'Logging patterns found in code but no log retention configuration in infra',
  check: (_l1, _l2, l3Results, l4Results) => {
    const findings: CrossLayerFinding[] = [];

    const hasLoggingCode = l4Results.some(
      (r) => r.category === 'logging' && r.status === 'FOUND',
    );
    const hasRetentionConfig = l3Results.some(
      (r) => r.type === 'log-retention' && r.status === 'OK',
    );

    if (hasLoggingCode && !hasRetentionConfig) {
      findings.push({
        ruleId: 'cross-logging-no-retention',
        description: 'AI logging implemented in code but no log retention configuration found. Art. 12 requires log retention >= 180 days.',
        severity: 'medium',
        layers: ['L3', 'L4'],
        obligationId: 'eu-ai-act-OBL-006',
        article: 'Art. 12',
      });
    }

    return findings;
  },
};

// Rule 5: Kill switch found but no test files → untested safety mechanism
const killSwitchWithoutTest: CrossLayerRule = {
  id: 'cross-kill-switch-no-test',
  description: 'Kill switch pattern found but no test files detected',
  check: (l1Results, _l2, _l3, l4Results) => {
    const findings: CrossLayerFinding[] = [];

    const hasKillSwitch = l4Results.some(
      (r) => r.category === 'kill-switch' && r.status === 'FOUND',
    );
    const hasTestFiles = l1Results.some(
      (r) => r.type === 'pass' && r.checkId.includes('test'),
    );

    // Approximate: check if any file in L1 indicates tests
    // This checks the L1 pass checks — if none pass related to testing, flag it
    if (hasKillSwitch && !hasTestFiles) {
      findings.push({
        ruleId: 'cross-kill-switch-no-test',
        description: 'AI kill switch pattern found in code but no automated tests detected for it. Safety mechanisms should be tested.',
        severity: 'low',
        layers: ['L1', 'L4'],
        article: 'Art. 14',
      });
    }

    return findings;
  },
};

// Rule 6: Passport permissions vs actual code patterns mismatch
const passportCodeMismatch: CrossLayerRule = {
  id: 'cross-passport-code-mismatch',
  description: 'Passport permissions do not match actual code patterns detected by L4',
  check: (l1Results, _l2, _l3, l4Results) => {
    const findings: CrossLayerFinding[] = [];

    // Check if passport exists (L1 passport-presence pass)
    const hasPassport = l1Results.some(
      (r) => r.type === 'pass' && r.checkId === 'passport-presence',
    );

    if (!hasPassport) return findings;

    // If passport claims compliance but L4 finds bare LLM calls, flag mismatch
    const bareLlmCalls = l4Results.filter(
      (r) => r.category === 'bare-llm' && r.status === 'FOUND',
    );
    const hasDisclosure = l4Results.some(
      (r) => r.category === 'disclosure' && r.status === 'FOUND',
    );

    if (bareLlmCalls.length > 0 && !hasDisclosure) {
      findings.push({
        ruleId: 'cross-passport-code-mismatch',
        description: `Agent Passport exists but ${bareLlmCalls.length} unwrapped LLM call(s) found without disclosure. Passport should reflect actual code practices.`,
        severity: 'high',
        layers: ['L1', 'L4'],
        obligationId: 'eu-ai-act-OBL-011',
        article: 'Art. 26(4)',
      });
    }

    return findings;
  },
};

export const CROSS_LAYER_RULES: readonly CrossLayerRule[] = [
  docCodeMismatch,
  sdkNoDisclosure,
  bannedWithWrapper,
  loggingNoRetention,
  killSwitchWithoutTest,
  passportCodeMismatch,
];

export const runCrossLayerChecks = (
  l1Results: readonly CheckResult[],
  l2Results: readonly L2CheckResult[],
  l3Results: readonly L3CheckResult[],
  l4Results: readonly L4CheckResult[],
): readonly CrossLayerFinding[] => {
  const allFindings: CrossLayerFinding[] = [];

  for (const rule of CROSS_LAYER_RULES) {
    allFindings.push(...rule.check(l1Results, l2Results, l3Results, l4Results));
  }

  return allFindings;
};

export const crossLayerToCheckResults = (findings: readonly CrossLayerFinding[]): readonly CheckResult[] =>
  findings.map((f): CheckResult => ({
    type: 'fail',
    checkId: f.ruleId,
    message: f.description,
    severity: f.severity,
    obligationId: f.obligationId,
    articleReference: f.article,
  }));
