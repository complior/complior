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
        'ai:model': '[MODEL_NAME]',
        'ai:provider': '[PROVIDER]',
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
    .concat(['ai-literacy', 'gpai-transparency', 'gpai-systemic-risk']),
);

const documentationStrategy: FixStrategy = (finding, context) => {
  // Only generate documents for document-presence checks, not permission/pattern checks
  if (!DOCUMENT_CHECK_IDS.has(finding.checkId)) return null;

  const oblId = finding.obligationId;
  if (!oblId) return null;

  const mapping = TEMPLATE_MAP.find((m) => m.obligationId === oblId);
  if (!mapping) return null;

  // Check if output file already exists
  if (context.existingFiles.some((f) => f.endsWith(mapping.outputFile))) return null;

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
    organization: '[TO BE SET]',
    ai_systems: [
      {
        name: '[TO BE SET]',
        provider: '[TO BE SET]',
        risk_level: '[TO BE SET]',
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

// --- Strategy registry ---
// NOTE: friaStrategy removed — documentationStrategy handles OBL-013 via template-registry

const STRATEGIES: readonly FixStrategy[] = [
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
