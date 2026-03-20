import type { Finding } from '../../types/common.types.js';
import type { FixPlan, FixContext, FixStrategy, FixAction, TemplateMapping } from './types.js';
import { generateCreateDiff } from './diff.js';
import { ENGINE_VERSION } from '../../version.js';
import { TEMPLATE_REGISTRY } from '../../data/template-registry.js';

// --- Template mapping: derived from TEMPLATE_REGISTRY (single source of truth) ---

const TEMPLATE_MAP: readonly TemplateMapping[] = TEMPLATE_REGISTRY.map((e) => ({
  obligationId: e.obligationId,
  article: e.article,
  templateFile: e.templateFile,
  outputFile: e.outputFile,
  description: e.description,
}));

// --- Strategy: Disclosure (Art. 50.1) ---

const disclosureStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'ai-disclosure') return null;

  const fw = context.framework.toLowerCase();
  let action: FixAction;

  if (fw.includes('next') || fw.includes('react')) {
    const componentPath = 'src/components/AIDisclosure.tsx';
    const content = `export const AIDisclosure = () => (
  <div role="status" aria-label="AI Disclosure" className="ai-disclosure">
    <p>This service uses artificial intelligence. Responses are AI-generated and may contain errors.</p>
  </div>
);
`;
    action = {
      type: 'create',
      path: componentPath,
      content,
      description: 'Create AIDisclosure React component',
    };
    return {
      obligationId: finding.obligationId ?? 'eu-ai-act-OBL-015',
      checkId: finding.checkId,
      article: finding.articleReference ?? 'Art. 50(1)',
      fixType: 'code_injection',
      framework: context.framework,
      actions: [action],
      diff: generateCreateDiff(componentPath, content),
      scoreImpact: 7,
      commitMessage: 'fix: add AI disclosure component (Art. 50.1) -- via Complior',
      description: 'Add visible AI disclosure notice for users interacting with AI system',
    };
  }

  // Express / Fastify / Hono / generic server
  const middlewarePath = 'src/middleware/ai-disclosure.ts';
  const content = `// AI Disclosure Middleware (EU AI Act, Art. 50.1)
// Adds transparency headers to all AI-related responses

export const aiDisclosureMiddleware = (req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
  res.setHeader('X-AI-Disclosure', 'This service uses artificial intelligence');
  res.setHeader('X-AI-Provider', 'See /api/ai-disclosure for details');
  next();
};

export const AI_DISCLOSURE_TEXT = 'This service uses artificial intelligence. Responses are AI-generated and may contain errors.';
`;
  action = {
    type: 'create',
    path: middlewarePath,
    content,
    description: 'Create AI disclosure middleware with transparency headers',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-015',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 50(1)',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(middlewarePath, content),
    scoreImpact: 7,
    commitMessage: 'fix: add AI disclosure middleware (Art. 50.1) -- via Complior',
    description: 'Add AI disclosure middleware with transparency headers',
  };
};

// --- Strategy: Content Marking (Art. 50.2) ---

const contentMarkingStrategy: FixStrategy = (finding, context) => {
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

// --- Strategy: Interaction Logging (Art. 12) ---

const loggingStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'interaction-logging') return null;

  const loggerPath = 'src/logging/ai-interaction-logger.ts';
  const content = `// AI Interaction Logger (EU AI Act, Art. 12)
// Automatic logging of AI system interactions for traceability

export interface AIInteractionLog {
  readonly timestamp: string;
  readonly sessionId: string;
  readonly inputHash: string;
  readonly outputHash: string;
  readonly model: string;
  readonly provider: string;
  readonly durationMs: number;
  readonly tokensUsed?: number;
}

const logs: AIInteractionLog[] = [];

export const logInteraction = (entry: Omit<AIInteractionLog, 'timestamp'>): void => {
  logs.push({ ...entry, timestamp: new Date().toISOString() });
};

export const getInteractionLogs = (): readonly AIInteractionLog[] => [...logs];

export const clearLogs = (): void => { logs.length = 0; };
`;
  const action: FixAction = {
    type: 'create',
    path: loggerPath,
    content,
    description: 'Create AI interaction logger for traceability',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-007',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 12',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(loggerPath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add AI interaction logger (Art. 12) -- via Complior',
    description: 'Add automatic logging of AI system interactions for traceability',
  };
};

// --- Strategy: Documentation (templates) ---

/** CheckIds for which the documentation strategy should generate template fixes. */
const DOCUMENT_CHECK_IDS = new Set(
  TEMPLATE_REGISTRY.map((e) => e.docType)
    .concat(TEMPLATE_REGISTRY.map((e) => `l2-${e.docType}`))
    .concat(['ai-literacy', 'l2-ai-literacy', 'gpai-transparency', 'gpai-systemic-risk']),
);

const documentationStrategy: FixStrategy = (finding, context) => {
  // Only generate documents for document-presence checks, not permission/pattern checks
  if (!DOCUMENT_CHECK_IDS.has(finding.checkId)) return null;

  const oblId = finding.obligationId;
  if (!oblId) return null;

  const mapping = TEMPLATE_MAP.find((m) => m.obligationId === oblId);
  if (!mapping) return null;

  // For L1 (presence) findings: skip if file already exists
  // For L2 (structure/quality) findings: regenerate even if file exists (shallow doc → better template)
  const isL2 = finding.checkId.startsWith('l2-');
  if (!isL2 && context.existingFiles.some((f) => f.endsWith(mapping.outputFile))) return null;

  const action: FixAction = {
    type: 'create',
    path: mapping.outputFile,
    content: `[TEMPLATE:${mapping.templateFile}]`,
    description: `Generate ${mapping.description} from template`,
  };

  return {
    obligationId: oblId,
    checkId: finding.checkId,
    article: mapping.article,
    fixType: 'template_generation',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(mapping.outputFile, `# ${mapping.description}\n\n[Generated from template: ${mapping.templateFile}]`),
    scoreImpact: 8,
    commitMessage: `fix: generate ${mapping.description} (${mapping.article}) -- via Complior`,
    description: `Generate ${mapping.description} from compliance template`,
  };
};

// --- Strategy: Compliance Metadata ---

const metadataStrategy: FixStrategy = (finding, context) => {
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

// --- Strategy: SDK Wrapper (Art. 50.1) ---

const sdkWrapperStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-bare-llm') return null;

  const fw = context.framework.toLowerCase();
  let filePath: string;
  let content: string;

  if (fw.includes('next') || fw.includes('react')) {
    filePath = 'src/hooks/useCompliorAI.ts';
    content = `// AI Compliance Wrapper Hook (EU AI Act, Art. 50.1)
import { complior } from '@complior/sdk';

const wrappedClient = complior(aiClient, {
  disclosure: true,
  logging: true,
  contentMarking: true,
});

export const useCompliorAI = () => wrappedClient;
`;
  } else {
    filePath = 'src/middleware/ai-compliance-wrapper.ts';
    content = `// AI Compliance Wrapper (EU AI Act, Art. 50.1)
import { complior } from '@complior/sdk';

export const createCompliantClient = (client: unknown) =>
  complior(client, {
    disclosure: true,
    logging: true,
    contentMarking: true,
  });
`;
  }

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create SDK compliance wrapper for bare LLM calls',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-015',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 50(1)',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 6,
    commitMessage: 'fix: add SDK compliance wrapper for bare LLM calls (Art. 50.1) -- via Complior',
    description: 'Wrap bare LLM client calls with @complior/sdk for automatic compliance',
  };
};

// --- Strategy: Permission Guard (Art. 14) ---

const permissionGuardStrategy: FixStrategy = (finding, context) => {
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

// --- Strategy: Kill Switch (Art. 14.4) ---

const killSwitchStrategy: FixStrategy = (finding, context) => {
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

// --- Strategy: Error Handler (Art. 15.4) ---

const errorHandlerStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l4-security-risk' && finding.checkId !== 'l4-ast-missing-error-handling') return null;

  const filePath = 'src/middleware/ai-error-handler.ts';
  const content = `// AI Error Handler (EU AI Act, Art. 15.4)
// Compliance-aware error handling for AI operations

export interface AIErrorLog {
  readonly timestamp: string;
  readonly operation: string;
  readonly error: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly aiSystemId?: string;
}

const errorLog: AIErrorLog[] = [];

export const withAIErrorHandling = async <T>(
  operation: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    const entry: AIErrorLog = {
      timestamp: new Date().toISOString(),
      operation,
      error: err instanceof Error ? err.message : String(err),
      severity: 'high',
    };
    errorLog.push(entry);
    console.error(\`[AI-ERROR] \${operation}: \${entry.error}\`);
    return fallback;
  }
};

export const getErrorLog = (): readonly AIErrorLog[] => [...errorLog];
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create AI error handler with compliance logging',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-008',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 15(4)',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 4,
    commitMessage: 'fix: add AI error handler (Art. 15.4) -- via Complior',
    description: 'Add compliance-aware error handling with incident logging',
  };
};

// --- Strategy: HITL Gate / Conformity Assessment (Art. 19) ---

const hitlGateStrategy: FixStrategy = (finding, context) => {
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

// --- Strategy: Data Governance (Art. 10) ---

const dataGovernanceStrategy: FixStrategy = (finding, context) => {
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

// --- Strategy: Secret Rotation (Art. 15.4) ---

const secretRotationStrategy: FixStrategy = (finding, context) => {
  if (!finding.checkId.startsWith('l4-nhi-') || finding.checkId === 'l4-nhi-clean') return null;

  // Extract secret type from checkId: l4-nhi-openai-key → OPENAI_API_KEY
  const suffix = finding.checkId.replace('l4-nhi-', '').replace(/-/g, '_').toUpperCase();
  const envVar = suffix.endsWith('_KEY') ? suffix : `${suffix}_KEY`;

  const gitignoreContent = `# Secrets — never commit
.env
.env.*
*.key
*.pem
*.p12
`;

  const envExampleContent = `# Replace with vault references or environment-specific values
${envVar}=<replace-with-vault-reference>
`;

  const actions: FixAction[] = [
    {
      type: 'create',
      path: '.gitignore',
      content: gitignoreContent,
      description: 'Add secret file patterns to .gitignore',
    },
    {
      type: 'create',
      path: '.env.example',
      content: envExampleContent,
      description: 'Create .env.example with placeholder secret references',
    },
  ];

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-008',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 15(4)',
    fixType: 'config_fix',
    framework: context.framework,
    actions,
    diff: generateCreateDiff('.gitignore', gitignoreContent) + '\n' + generateCreateDiff('.env.example', envExampleContent),
    scoreImpact: 6,
    commitMessage: `fix: add secret rotation scaffold for ${envVar} (Art. 15.4) -- via Complior`,
    description: `Add .gitignore entries and .env.example for secret ${envVar}`,
  };
};

// --- Strategy: Bandit Fix (Art. 15.4) ---

const BANDIT_FIXES: Record<string, { issue: string; fix: string }> = {
  'B301': { issue: 'Use of pickle (deserialization risk)', fix: 'Replace pickle with json or yaml for data serialization' },
  'B603': { issue: 'subprocess call with shell=True', fix: 'Use subprocess.run() with a list of arguments instead of shell=True' },
  'B608': { issue: 'SQL injection via string formatting', fix: 'Use parameterized queries instead of string concatenation' },
  'B105': { issue: 'Hardcoded password in source code', fix: 'Move password to environment variable or secrets manager' },
};

const banditFixStrategy: FixStrategy = (finding, context) => {
  if (!finding.checkId.startsWith('ext-bandit-')) return null;

  const ruleId = finding.checkId.replace('ext-bandit-', '').toUpperCase();
  const known = BANDIT_FIXES[ruleId];

  const lines = [`# Security Fixes — Bandit Findings\n`];
  lines.push(`Generated by Complior v${ENGINE_VERSION}\n`);

  if (known) {
    lines.push(`## ${ruleId}: ${known.issue}\n`);
    lines.push(`**Fix:** ${known.fix}\n`);
  } else {
    lines.push(`## ${ruleId}: Security finding\n`);
    lines.push(`**Fix:** Review the flagged code and apply the recommended remediation from Bandit documentation.\n`);
  }

  if (finding.message) {
    lines.push(`### Details\n`);
    lines.push(`${finding.message}\n`);
  }

  lines.push(`## Verification\n`);
  lines.push(`- [ ] Fix applied\n- [ ] Re-run \`bandit\` to verify\n- [ ] Peer review completed\n`);

  const content = lines.join('\n');
  const filePath = 'complior-security-fixes.md';

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: `Create security fix plan for Bandit ${ruleId}`,
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-008',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 15(4)',
    fixType: 'template_generation',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 4,
    commitMessage: `fix: add Bandit ${ruleId} remediation plan (Art. 15.4) -- via Complior`,
    description: `Create security remediation plan for Bandit finding ${ruleId}`,
  };
};

// --- Strategy: CVE Upgrade (Art. 15) ---

const cveUpgradeStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l3-dep-vuln') return null;

  const filePath = 'complior-upgrade-plan.md';
  const content = `# Dependency Vulnerability Upgrade Plan

Generated by Complior v${ENGINE_VERSION}

## Vulnerability Summary

${finding.message || 'Vulnerable dependency detected — see scan results for details.'}

## Upgrade Commands

### npm / Node.js
\`\`\`bash
npm audit fix
npm update <package-name>
\`\`\`

### pip / Python
\`\`\`bash
pip install --upgrade <package-name>
pip-audit --fix
\`\`\`

### cargo / Rust
\`\`\`bash
cargo update <package-name>
cargo audit fix
\`\`\`

## Verification Checklist

- [ ] Run \`npm audit\` / \`pip-audit\` / \`cargo audit\` after upgrade
- [ ] Run full test suite to verify no regressions
- [ ] Update lock file and commit
- [ ] Review changelog for breaking changes
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create dependency upgrade plan for CVE remediation',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-008',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 15',
    fixType: 'dependency_fix',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add dependency vulnerability upgrade plan (Art. 15) -- via Complior',
    description: 'Create upgrade plan for vulnerable dependencies',
  };
};

// --- Strategy: License Fix (Art. 5) ---

const licenseFixStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'l3-dep-license') return null;

  const filePath = 'complior-license-review.md';
  const content = `# License Compliance Review

Generated by Complior v${ENGINE_VERSION}

## Issue

${finding.message || 'Dependency with incompatible or problematic license detected.'}

## License Compatibility Matrix

| License | Commercial Use | Modification | Distribution | Patent Grant |
|---------|---------------|-------------|-------------|-------------|
| MIT     | Yes           | Yes         | Yes         | No          |
| Apache-2.0 | Yes       | Yes         | Yes         | Yes         |
| GPL-3.0 | Copyleft      | Copyleft    | Copyleft    | Yes         |
| AGPL-3.0 | Copyleft     | Copyleft    | Copyleft (network) | Yes  |
| SSPL    | Restricted    | Copyleft    | Copyleft    | No          |

## Action Items

- [ ] Identify the problematic dependency and its license
- [ ] Search for an alternative package with a compatible license
- [ ] Run \`npx license-checker\` or \`pip-licenses\` for a full audit
- [ ] Update dependency and verify license compatibility
- [ ] Document license decision in compliance records
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create license compliance review document',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-002',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 5',
    fixType: 'dependency_fix',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 4,
    commitMessage: 'fix: add license compliance review (Art. 5) -- via Complior',
    description: 'Create license review document for dependency with problematic license',
  };
};

// --- Strategy: CI Compliance (Art. 17) ---

const ciComplianceStrategy: FixStrategy = (finding, context) => {
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

// --- Strategy: Bias Testing (Art. 10) ---

const biasTestingStrategy: FixStrategy = (finding, context) => {
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

// --- Strategy: Doc-Code Sync (Art. 11) ---

const docCodeSyncStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'cross-doc-code-mismatch') return null;

  const filePath = 'complior-doc-sync-report.md';
  const content = `# Documentation-Code Sync Report

Generated by Complior v${ENGINE_VERSION}

## Mismatch Detected

${finding.message || 'Documentation does not match the current codebase implementation.'}

## Checklist

- [ ] Review flagged documentation sections
- [ ] Update technical documentation to match current implementation
- [ ] Verify API documentation reflects actual endpoints and parameters
- [ ] Check that architecture diagrams are up to date
- [ ] Run \`complior scan\` to verify documentation coverage

## Auto-generate Missing Docs

\`\`\`bash
complior docs generate --missing
\`\`\`
`;

  const action: FixAction = {
    type: 'create',
    path: filePath,
    content,
    description: 'Create documentation-code sync report',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-005',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 11',
    fixType: 'template_generation',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(filePath, content),
    scoreImpact: 5,
    commitMessage: 'fix: add doc-code sync report (Art. 11) -- via Complior',
    description: 'Create report documenting mismatches between code and documentation',
  };
};

// --- Strategy registry ---
// NOTE: friaStrategy removed — documentationStrategy handles OBL-013 via template-registry

const STRATEGIES: readonly FixStrategy[] = [
  sdkWrapperStrategy,
  permissionGuardStrategy,
  killSwitchStrategy,
  errorHandlerStrategy,
  hitlGateStrategy,
  dataGovernanceStrategy,
  secretRotationStrategy,
  banditFixStrategy,
  cveUpgradeStrategy,
  licenseFixStrategy,
  ciComplianceStrategy,
  biasTestingStrategy,
  docCodeSyncStrategy,
  disclosureStrategy,
  contentMarkingStrategy,
  loggingStrategy,
  metadataStrategy,
  documentationStrategy,    // catch-all for obligation-based template fixes (incl. FRIA)
];

export const findStrategy = (finding: Finding, context: FixContext): FixPlan | null => {
  for (const strategy of STRATEGIES) {
    const plan = strategy(finding, context);
    if (plan !== null) return plan;
  }
  return null;
};

export const getTemplateMap = (): readonly TemplateMapping[] => TEMPLATE_MAP;
