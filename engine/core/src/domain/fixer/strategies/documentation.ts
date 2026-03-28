import type { FixStrategy, FixAction, TemplateMapping } from '../types.js';
import { generateCreateDiff } from '../diff.js';
import { TEMPLATE_REGISTRY } from '../../../data/template-registry.js';

// --- Template mapping: derived from TEMPLATE_REGISTRY (single source of truth) ---

const TEMPLATE_MAP: readonly TemplateMapping[] = TEMPLATE_REGISTRY.map((e) => ({
  obligationId: e.obligationId,
  article: e.article,
  templateFile: e.templateFile,
  outputFile: e.outputFile,
  description: e.description,
}));

/** CheckIds for which the documentation strategy should generate template fixes. */
const DOCUMENT_CHECK_IDS = new Set(
  TEMPLATE_REGISTRY.map((e) => e.docType)
    .concat(TEMPLATE_REGISTRY.map((e) => `l2-${e.docType}`))
    .concat(['ai-literacy', 'l2-ai-literacy', 'gpai-transparency', 'gpai-systemic-risk']),
);

export const documentationStrategy: FixStrategy = (finding, context) => {
  // Only generate documents for document-presence checks, not permission/pattern checks
  if (!DOCUMENT_CHECK_IDS.has(finding.checkId)) return null;

  const oblId = finding.obligationId;
  if (!oblId) return null;

  const mapping = TEMPLATE_MAP.find((m) => m.obligationId === oblId);
  if (!mapping) return null;

  // For L1 (presence) findings: skip if file already exists
  // For L2 (structure/quality) findings: only fix scaffold/none — never overwrite draft/reviewed docs
  const isL2 = finding.checkId.startsWith('l2-');
  if (isL2 && (finding.docQuality === 'draft' || finding.docQuality === 'reviewed')) return null;
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

export const getTemplateMap = (): readonly TemplateMapping[] => TEMPLATE_MAP;
