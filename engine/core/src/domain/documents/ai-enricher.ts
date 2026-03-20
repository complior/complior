/**
 * LLM-enriched document generation.
 * Takes deterministic generateDocument() output and enriches unfilled sections via LLM.
 * Extracted from document-generator.ts for SRP compliance.
 */
import type { LanguageModel } from 'ai';
import type { AgentPassport } from '../../types/passport.types.js';
import type { DocResult } from './document-generator.js';
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

const buildSystemPrompt = (docType: string): string =>
  `You are a compliance document specialist for the EU AI Act (Regulation 2024/1689).
You are enriching a ${docType} document with specific, actionable content based on the AI system's passport data.

Rules:
- Fill in placeholder sections (marked with <!-- GUIDANCE --> comments or containing generic "[...]" placeholders) with specific content based on the passport data
- Keep all existing filled content intact — do NOT modify already pre-filled fields
- For legal assertions that require human sign-off (signatures, legal declarations, notified body details), replace with [REVIEW REQUIRED: brief description of what's needed]
- Use professional regulatory language appropriate for EU AI Act compliance documentation
- Be specific and actionable — reference the actual system name, risk class, and capabilities
- Do NOT invent data that isn't in the passport (dates, test results, metrics) — use [TO BE COMPLETED: description] for those
- Keep the exact Markdown structure and heading hierarchy`;

/**
 * Enriches unfilled sections of a deterministic document via LLM.
 * Human-required legal assertions are left with [REVIEW REQUIRED].
 */
export const enrichDocumentWithAI = async (input: AiEnrichInput): Promise<AiEnrichedResult> => {
  const { baseResult, manifest, model } = input;
  const { generateText } = await import('ai');

  const passportContext = buildPassportContext(manifest);
  const systemPrompt = buildSystemPrompt(baseResult.docType);

  const prompt = `Here is the AI system passport data:
${passportContext}

Here are the manual fields that need enrichment: ${baseResult.manualFields.join(', ')}

Here is the document to enrich:
${baseResult.markdown}

Return the complete enriched document (full Markdown). Keep all existing content, enrich unfilled sections.`;

  try {
    const result = await complior(generateText)({ model, system: systemPrompt, prompt });
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
