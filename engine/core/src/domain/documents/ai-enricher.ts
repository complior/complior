/**
 * LLM-enriched document generation.
 * Two modes:
 *   1. Scaffold enrichment — fill [TODO] placeholders in freshly generated docs
 *   2. Draft enhancement — improve existing user-edited docs using L2 quality feedback
 * Extracted from document-generator.ts for SRP compliance.
 */
import type { LanguageModel } from 'ai';
import type { AgentPassport } from '../../types/passport.types.js';
import type { DocResult } from './document-generator.js';
import { extractSectionContents, measureSemanticDepth } from '../scanner/layers/layer2-parsing.js';
import { complior } from '@complior/sdk';

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
 * Analyze existing document content to find weak sections via L2 semantic depth.
 * Returns section names + actionable feedback for sections scoring below threshold.
 */
export const detectWeakSections = (content: string): readonly string[] => {
  const sections = extractSectionContents(content);
  const weak: string[] = [];
  for (const [heading, body] of sections) {
    const depth = measureSemanticDepth(body, heading);
    if (depth.isShallow || depth.placeholderCount > 0) {
      weak.push(heading);
    }
  }
  return weak;
};

/**
 * Build L2-informed feedback for the LLM prompt.
 * Tells the LLM exactly which sections need improvement and why.
 */
export const buildL2Feedback = (content: string): string => {
  const sections = extractSectionContents(content);
  const feedback: string[] = [];
  for (const [heading, body] of sections) {
    const depth = measureSemanticDepth(body, heading);
    if (depth.isShallow || depth.placeholderCount > 0) {
      const reasons: string[] = [];
      if (depth.placeholderCount > 0) reasons.push(`${depth.placeholderCount} placeholder(s) to fill`);
      if (depth.wordCount < 50) reasons.push(`only ${depth.wordCount} words (min 50)`);
      if (!depth.hasNumericMetrics) reasons.push('no numeric metrics');
      if (!depth.hasLegalReferences) reasons.push('no legal references');
      if (!depth.hasMeasurableTargets) reasons.push('no measurable targets');
      feedback.push(`- "${heading}": ${reasons.join(', ')}`);
    }
  }
  return feedback.length > 0 ? feedback.join('\n') : 'All sections appear adequate.';
};

const buildPassportContext = (manifest: AgentPassport): string =>
  [
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

const buildSystemPrompt = (docType: string, mode: 'scaffold' | 'enhance'): string => {
  const modeRules = mode === 'scaffold'
    ? `- Fill in placeholder sections (marked with <!-- GUIDANCE --> comments or containing generic "[...]" placeholders) with specific content based on the passport data
- Keep all existing filled content intact — do NOT modify already pre-filled fields`
    : `- The document has been partially filled by the user — preserve ALL existing content
- Strengthen weak sections identified in the quality feedback below
- Add numeric metrics, legal references (Art. numbers), measurable targets, and specific details
- Expand thin sections with concrete, actionable content based on the passport data`;

  return `You are a compliance document specialist for the EU AI Act (Regulation 2024/1689).
You are ${mode === 'scaffold' ? 'enriching' : 'strengthening'} a ${docType} document based on the AI system's passport data.

Rules:
${modeRules}
- For legal assertions that require human sign-off (signatures, legal declarations, notified body details), replace with [REVIEW REQUIRED: brief description of what's needed]
- Use professional regulatory language appropriate for EU AI Act compliance documentation
- Be specific and actionable — reference the actual system name, risk class, and capabilities
- Do NOT invent data that isn't in the passport (dates, test results, metrics) — use [TO BE COMPLETED: description] for those
- Keep the exact Markdown structure and heading hierarchy`;
};

/**
 * Enriches a compliance document via LLM.
 * Two modes detected automatically:
 *   - Scaffold: document has [TODO]/placeholder brackets → fill them
 *   - Enhance: document has real content but weak sections → strengthen with specifics
 * Human-required legal assertions are left with [REVIEW REQUIRED].
 */
export const enrichDocumentWithAI = async (input: AiEnrichInput): Promise<AiEnrichedResult> => {
  const { baseResult, manifest, model } = input;
  const { generateText } = await import('ai');

  const passportContext = buildPassportContext(manifest);

  // Auto-detect mode: scaffold (has placeholders) vs enhance (user-edited, no placeholders)
  const hasPlaceholders = /\[[^\]]{2,60}\](?!\()/.test(baseResult.markdown);
  const mode: 'scaffold' | 'enhance' = hasPlaceholders ? 'scaffold' : 'enhance';

  const systemPrompt = buildSystemPrompt(baseResult.docType, mode);
  const l2Feedback = buildL2Feedback(baseResult.markdown);

  const prompt = mode === 'scaffold'
    ? `Here is the AI system passport data:
${passportContext}

Here are the manual fields that need enrichment: ${baseResult.manualFields.join(', ')}

Here is the document to enrich:
${baseResult.markdown}

Return the complete enriched document (full Markdown). Keep all existing content, enrich unfilled sections.`
    : `Here is the AI system passport data:
${passportContext}

Quality analysis of weak sections that need strengthening:
${l2Feedback}

Here is the document to improve:
${baseResult.markdown}

Return the complete improved document (full Markdown). Preserve all existing content. Strengthen the weak sections identified above with specific details, metrics, and legal references.`;

  try {
    const result = await complior(generateText)({ model, system: systemPrompt, prompt });
    const marker = `\n\n<!-- complior:reviewed ${new Date().toISOString()} -->`;
    const enrichedMarkdown = result.text.trim() + marker;

    // Count how many fields were likely addressed
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
