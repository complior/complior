import type { LanguageModel } from 'ai';
import type { AgentPassport } from '../../types/passport.types.js';
import { deriveOversightDescription } from './passport-helpers.js';
import {
  ALL_DOC_TYPES as _ALL_DOC_TYPES,
  TEMPLATE_FILE_MAP as _TEMPLATE_FILE_MAP,
  DOC_ID_PREFIX_MAP,
  DOC_ID_PATTERN_MAP,
  type DocType as _DocType,
} from '../../data/template-registry.js';

// --- Types (re-exported from template-registry — single source of truth) ---

export const ALL_DOC_TYPES = _ALL_DOC_TYPES;
export type DocType = _DocType;
export const TEMPLATE_FILE_MAP = _TEMPLATE_FILE_MAP;

export interface DocGeneratorInput {
  readonly manifest: AgentPassport;
  readonly template: string;
  readonly docType: DocType;
  readonly organization?: string;
}

export interface DocResult {
  readonly markdown: string;
  readonly docType: DocType;
  readonly prefilledFields: readonly string[];
  readonly manualFields: readonly string[];
}

// --- Helpers ---

const generateDocId = (prefix: string): string => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${prefix}-${year}-${seq}`;
};

// --- Generator ---

export const generateDocument = (input: DocGeneratorInput): DocResult => {
  const { manifest, template, docType, organization } = input;
  const prefilledFields: string[] = [];
  const manualFields: string[] = [];

  let markdown = template;
  const today = new Date().toISOString().split('T')[0]!;

  // --- Common placeholders (shared across all templates) ---

  // Company Name / Organization
  const orgName = organization ?? manifest.owner?.team;
  if (orgName) {
    markdown = markdown.replaceAll('[Company Name]', orgName);
    markdown = markdown.replaceAll('[Organization]', orgName);
    prefilledFields.push('Company Name');
  } else {
    manualFields.push('Company Name');
  }

  // Date
  markdown = markdown.replaceAll('[Date]', today);
  prefilledFields.push('Date');

  // AI System Name
  markdown = markdown.replaceAll('[AI System Name]', manifest.display_name);
  prefilledFields.push('AI System Name');

  // Provider
  const provider = manifest.model?.provider ?? '';
  if (provider) {
    markdown = markdown.replaceAll('[Provider name]', provider);
    markdown = markdown.replaceAll('[Provider]', provider);
    prefilledFields.push('Provider');
  } else {
    manualFields.push('Provider');
  }

  // Version
  markdown = markdown.replaceAll('[X.Y]', manifest.version);
  prefilledFields.push('Version');

  // Description
  markdown = markdown.replaceAll('[Description]', manifest.description);
  prefilledFields.push('Description');

  // Risk class
  const riskClass = manifest.compliance?.eu_ai_act?.risk_class ?? '';
  if (riskClass) {
    markdown = markdown.replaceAll('[Risk Class]', riskClass);
    prefilledFields.push('Risk Class');
  } else {
    manualFields.push('Risk Class');
  }

  // Human Oversight Description
  const oversightDesc = deriveOversightDescription(manifest);
  markdown = markdown.replaceAll(
    '[Human Oversight Description]',
    oversightDesc,
  );

  // Autonomy Level
  markdown = markdown.replaceAll('[Autonomy Level]', manifest.autonomy_level);

  // Model ID
  const modelId = manifest.model?.model_id ?? '';
  if (modelId) {
    markdown = markdown.replaceAll('[Model ID]', modelId);
  }

  // Document ID (type-specific prefix)
  const idPattern = DOC_ID_PATTERN_MAP[docType];
  const idPrefix = DOC_ID_PREFIX_MAP[docType];
  if (idPattern && idPrefix && markdown.includes(idPattern)) {
    const docId = generateDocId(idPrefix);
    markdown = markdown.replace(idPattern, docId);
    prefilledFields.push('Document ID');
  }

  // [Name, Title] — always manual
  if (markdown.includes('[Name, Title]')) {
    manualFields.push('Approved By (Name, Title)');
  }

  // --- Type-specific handling ---

  switch (docType) {
    case 'ai-literacy':
      manualFields.push('Training levels configuration');
      manualFields.push('AI systems in scope table');
      manualFields.push('Training schedule');
      manualFields.push('Sign-off signatures');
      break;

    case 'art5-screening':
      manualFields.push('Prohibited practice details');
      manualFields.push('Risk assessment');
      manualFields.push('Decision and justification');
      break;

    case 'technical-documentation':
      manualFields.push('System architecture details');
      manualFields.push('Training data characteristics');
      manualFields.push('Performance metrics');
      manualFields.push('Monitoring measures');
      break;

    case 'incident-report':
      manualFields.push('Incident description');
      manualFields.push('Root cause analysis');
      manualFields.push('Corrective actions');
      manualFields.push('Market surveillance authority');
      break;

    case 'declaration-of-conformity':
      manualFields.push('Harmonised standards used');
      manualFields.push('Notified body details');
      manualFields.push('Conformity assessment procedure');
      manualFields.push('Signatory');
      break;

    case 'monitoring-policy':
      manualFields.push('AI systems in scope table');
      manualFields.push('Human oversight assignments');
      manualFields.push('Log retention schedule');
      manualFields.push('Review frequency');
      break;

    case 'fria':
      manualFields.push('Affected groups identification');
      manualFields.push('Rights impact severity assessment');
      manualFields.push('Mitigation measures');
      manualFields.push('Stakeholder consultation records');
      break;

    case 'worker-notification':
      manualFields.push('Affected worker groups');
      manualFields.push('AI system capabilities description');
      manualFields.push('Worker rights and escalation');
      manualFields.push('Notification timeline');
      break;

    case 'risk-management':
      manualFields.push('Known risks identification');
      manualFields.push('Misuse scenarios');
      manualFields.push('Residual risk assessment');
      manualFields.push('Test results and methodology');
      manualFields.push('Mitigation measures');
      break;

    case 'data-governance':
      manualFields.push('Data sources and origins');
      manualFields.push('Collection and preparation methods');
      manualFields.push('Quality metrics and targets');
      manualFields.push('Bias analysis');
      manualFields.push('Representativeness assessment');
      break;

    case 'qms':
      manualFields.push('Compliance strategy');
      manualFields.push('Design control procedures');
      manualFields.push('Testing procedures');
      manualFields.push('Roles and responsibilities');
      manualFields.push('Change management');
      break;

    case 'instructions-for-use':
      manualFields.push('Intended purpose details');
      manualFields.push('Performance metrics and benchmarks');
      manualFields.push('Known limitations');
      manualFields.push('Human oversight procedures');
      manualFields.push('Input data specifications');
      break;

    case 'gpai-transparency':
      manualFields.push('Training data sources');
      manualFields.push('Benchmark results');
      manualFields.push('Safety evaluations');
      manualFields.push('Copyright compliance policy');
      manualFields.push('Energy consumption data');
      break;

    case 'gpai-systemic-risk':
      manualFields.push('Adversarial testing results');
      manualFields.push('Systemic risk assessment');
      manualFields.push('Incident tracking procedures');
      manualFields.push('Cybersecurity measures');
      break;
  }

  return Object.freeze({
    markdown,
    docType,
    prefilledFields: Object.freeze([...prefilledFields]),
    manualFields: Object.freeze([...manualFields]),
  });
};

// --- LLM-enriched generation ---

export interface AiEnrichInput {
  readonly baseResult: DocResult;
  readonly manifest: AgentPassport;
  readonly model: LanguageModel;
}

export interface AiEnrichedResult extends DocResult {
  readonly aiEnriched: true;
  readonly aiFieldsCount: number;
}

/**
 * Takes deterministic generateDocument() output and enriches unfilled sections via LLM.
 * The LLM receives the passport context and fills guidance/placeholder sections with
 * domain-specific content. Human-required legal assertions are left with [REVIEW REQUIRED].
 */
export const enrichDocumentWithAI = async (input: AiEnrichInput): Promise<AiEnrichedResult> => {
  const { baseResult, manifest, model } = input;
  const { generateText } = await import('ai');

  const passportContext = [
    `System: ${manifest.display_name}`,
    `Description: ${manifest.description}`,
    `Risk class: ${manifest.compliance?.eu_ai_act?.risk_class ?? 'unknown'}`,
    `Autonomy: ${manifest.autonomy_level}`,
    `Provider: ${manifest.model?.provider ?? 'unknown'}`,
    `Model: ${manifest.model?.model_id ?? 'unknown'}`,
    manifest.owner?.team ? `Organization: ${manifest.owner.team}` : '',
    manifest.oversight?.responsible_person ? `Oversight: ${manifest.oversight.responsible_person} (${manifest.oversight.role})` : '',
    manifest.permissions?.tools ? `Tools: ${(manifest.permissions.tools as readonly string[]).join(', ')}` : '',
    manifest.constraints?.prohibited_actions ? `Prohibited: ${(manifest.constraints.prohibited_actions as readonly string[]).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are a compliance document specialist for the EU AI Act (Regulation 2024/1689).
You are enriching a ${baseResult.docType} document with specific, actionable content based on the AI system's passport data.

Rules:
- Fill in placeholder sections (marked with <!-- GUIDANCE --> comments or containing generic "[...]" placeholders) with specific content based on the passport data
- Keep all existing filled content intact — do NOT modify already pre-filled fields
- For legal assertions that require human sign-off (signatures, legal declarations, notified body details), replace with [REVIEW REQUIRED: brief description of what's needed]
- Use professional regulatory language appropriate for EU AI Act compliance documentation
- Be specific and actionable — reference the actual system name, risk class, and capabilities
- Do NOT invent data that isn't in the passport (dates, test results, metrics) — use [TO BE COMPLETED: description] for those
- Keep the exact Markdown structure and heading hierarchy`;

  const prompt = `Here is the AI system passport data:
${passportContext}

Here are the manual fields that need enrichment: ${baseResult.manualFields.join(', ')}

Here is the document to enrich:
${baseResult.markdown}

Return the complete enriched document (full Markdown). Keep all existing content, enrich unfilled sections.`;

  try {
    const result = await generateText({ model, system: systemPrompt, prompt });
    const enrichedMarkdown = result.text.trim();

    // Count how many manual fields were likely addressed
    const remainingPlaceholders = (enrichedMarkdown.match(/\[(?:TO BE COMPLETED|REVIEW REQUIRED)[^\]]*\]/g) ?? []).length;
    const aiFieldsCount = Math.max(0, baseResult.manualFields.length - remainingPlaceholders);

    return Object.freeze({
      markdown: enrichedMarkdown,
      docType: baseResult.docType,
      prefilledFields: Object.freeze([...baseResult.prefilledFields]),
      manualFields: Object.freeze([...baseResult.manualFields]),
      aiEnriched: true as const,
      aiFieldsCount,
    });
  } catch {
    // LLM failure — return base result without enrichment
    return Object.freeze({
      ...baseResult,
      aiEnriched: true as const,
      aiFieldsCount: 0,
    });
  }
};
