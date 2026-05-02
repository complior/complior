import type { FixStrategy, FixAction, TemplateMapping } from '../types.js';
import { generateCreateDiff } from '../diff.js';
import { TEMPLATE_REGISTRY } from '../../../data/template-registry.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

  const fullOutputPath = resolve(context.projectPath, mapping.outputFile);
  const fileExists = existsSync(fullOutputPath);

  // For L1 (presence) findings: skip if file already exists
  // For L2 (structure/quality) findings: only fix scaffold/none — never overwrite draft/reviewed docs
  const isL2 = finding.checkId.startsWith('l2-');
  if (isL2 && !context.useAi && (finding.docQuality === 'draft' || finding.docQuality === 'reviewed')) return null;
  if (!isL2 && (context.existingFiles.some((f) => f.endsWith(mapping.outputFile)) || fileExists)) return null;

  const action: FixAction = {
    type: fileExists ? 'enrich' : 'create',
    path: mapping.outputFile,
    content: `[TEMPLATE:${mapping.templateFile}]`,
    description: fileExists
      ? `Enrich existing ${mapping.description} with template content`
      : `Generate ${mapping.description} from template`,
  };

  return {
    obligationId: oblId,
    checkId: finding.checkId,
    article: mapping.article,
    // V1-M30.9 W-2 / BUG-2b regression fix: fixType (template vs LLM-driven)
    // is INDEPENDENT of action.type (create vs enrich-existing). Pre-existing
    // BUG-2b spec: L2 + useAi → ai_enrichment regardless of file presence.
    // The action.type 'enrich' (above) handles the file-already-exists case.
    fixType: isL2 && context.useAi ? 'ai_enrichment' : 'template_generation',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(mapping.outputFile, `# ${mapping.description}\n\n[Generated from template: ${mapping.templateFile}]`),
    scoreImpact: 8,
    commitMessage: fileExists
      ? `fix: enrich ${mapping.description} (${mapping.article}) -- via Complior`
      : `fix: generate ${mapping.description} (${mapping.article}) -- via Complior`,
    description: fileExists
      ? `Enrich existing ${mapping.description}`
      : `Generate ${mapping.description} from compliance template`,
  };
};

export const getTemplateMap = (): readonly TemplateMapping[] => TEMPLATE_MAP;
