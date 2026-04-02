/**
 * L5 Document Validation: LLM checks document CONTENT against
 * regulation-specific checklists (Art. 27 FRIA, Art. 11 Tech Doc, etc.).
 */

import type { Finding } from '../../../types/common.types.js';

export interface DocumentChecklist {
  readonly docType: string;
  readonly article: string;
  readonly elements: readonly ChecklistElement[];
}

export interface ChecklistElement {
  readonly id: string;
  readonly description: string;
  readonly required: boolean;
}

export interface DocValidationResult {
  readonly docType: string;
  readonly file: string;
  readonly qualityScore: number;          // 0-100
  readonly elementsPresent: number;
  readonly elementsTotal: number;
  readonly missingElements: readonly string[];
  readonly feedback: readonly string[];
  readonly severity: 'high' | 'medium' | 'low' | 'info';
}

/** Regulation checklists per document type */
export const DOCUMENT_CHECKLISTS: readonly DocumentChecklist[] = [
  {
    docType: 'fria',
    article: 'Art. 27',
    elements: [
      { id: 'affected-rights', description: 'Specific fundamental rights affected (Art. 6-50 EU Charter)', required: true },
      { id: 'quantitative-assessment', description: 'Quantitative risk assessment (probability × impact)', required: true },
      { id: 'mitigation-measures', description: 'Concrete mitigation measures (not generic)', required: true },
      { id: 'affected-population', description: 'Description of affected population', required: true },
      { id: 'monitoring-plan', description: 'Monitoring plan for rights impact', required: true },
      { id: 'proportionality', description: 'Proportionality analysis', required: false },
      { id: 'alternatives', description: 'Alternatives considered', required: false },
      { id: 'consultation', description: 'Stakeholder consultation process', required: false },
    ],
  },
  {
    docType: 'technical-documentation',
    article: 'Art. 11',
    elements: [
      { id: 'system-description', description: 'General description of the AI system', required: true },
      { id: 'intended-purpose', description: 'Intended purpose and intended use', required: true },
      { id: 'hardware-requirements', description: 'Hardware and software requirements', required: true },
      { id: 'training-data', description: 'Training data description and methodology', required: true },
      { id: 'performance-metrics', description: 'Performance metrics and benchmarks', required: true },
      { id: 'limitations', description: 'Known limitations and conditions of use', required: true },
      { id: 'human-oversight', description: 'Human oversight measures', required: true },
      { id: 'risk-management', description: 'Risk management measures', required: true },
      { id: 'testing-validation', description: 'Testing and validation procedures', required: true },
      { id: 'logging-capability', description: 'Logging capabilities description', required: false },
      { id: 'lifecycle-changes', description: 'Changes throughout lifecycle', required: false },
      { id: 'standards', description: 'Applied standards and conformity', required: false },
    ],
  },
  {
    docType: 'transparency-notice',
    article: 'Art. 13',
    elements: [
      { id: 'ai-disclosure', description: 'Clear disclosure that system uses AI', required: true },
      { id: 'capabilities', description: 'System capabilities description', required: true },
      { id: 'limitations', description: 'System limitations description', required: true },
      { id: 'human-contact', description: 'Human contact information', required: true },
      { id: 'opt-out', description: 'Opt-out mechanism description', required: false },
      { id: 'data-usage', description: 'Data usage explanation', required: false },
    ],
  },
  {
    docType: 'risk-management',
    article: 'Art. 9',
    elements: [
      { id: 'risk-identification', description: 'Risk identification methodology', required: true },
      { id: 'probability-assessment', description: 'Probability assessment for each risk', required: true },
      { id: 'impact-assessment', description: 'Impact assessment for each risk', required: true },
      { id: 'mitigation-measures', description: 'Mitigation measures per risk', required: true },
      { id: 'residual-risks', description: 'Residual risk assessment', required: true },
      { id: 'monitoring-plan', description: 'Risk monitoring plan', required: false },
      { id: 'review-schedule', description: 'Review schedule', required: false },
      { id: 'responsible-persons', description: 'Responsible persons', required: false },
    ],
  },
];

/**
 * Build LLM prompt for document validation.
 */
export const buildDocValidationPrompt = (
  docContent: string,
  checklist: DocumentChecklist,
): string => {
  const elementList = checklist.elements
    .map((e, i) => `${i + 1}. [${e.required ? 'REQUIRED' : 'OPTIONAL'}] ${e.id}: ${e.description}`)
    .join('\n');

  return `You are a compliance auditor validating a ${checklist.docType} document against EU AI Act ${checklist.article}.

Analyze the document below and determine which required elements are adequately covered.
An element is "present" if it contains SPECIFIC, CONCRETE information (not generic placeholder text).
Generic phrases like "we comply with all laws" or "risks will be assessed" are NOT adequate.

Document content:
---
${docContent.slice(0, 8000)}
---

Required elements to check:
${elementList}

Respond ONLY in this JSON format:
{
  "elements": [
    { "id": "element-id", "present": true/false, "adequate": true/false, "feedback": "specific feedback" }
  ],
  "overallScore": 0-100,
  "summary": "1-2 sentence summary"
}`;
};

/**
 * Convert document validation results into scanner findings.
 */
export const docValidationToFindings = (
  results: readonly DocValidationResult[],
): readonly Finding[] => {
  const findings: Finding[] = [];

  for (const result of results) {
    if (result.qualityScore >= 80) {
      findings.push({
        checkId: `l5-doc-${result.docType}`,
        type: 'pass',
        message: `${result.docType} content validation: ${result.elementsPresent}/${result.elementsTotal} elements adequate (score: ${result.qualityScore}/100)`,
        severity: 'info',
        confidence: 85,
        confidenceLevel: 'LIKELY_PASS',
        l5Analyzed: true,
      });
    } else {
      const missing = result.missingElements.join(', ');
      findings.push({
        checkId: `l5-doc-${result.docType}`,
        type: 'fail',
        message: `${result.docType} content validation: missing/inadequate elements: ${missing} (score: ${result.qualityScore}/100)`,
        severity: result.severity,
        obligationId: `eu-ai-act-doc-${result.docType}`,
        fix: result.feedback.join('; '),
        file: result.file,
        confidence: 85,
        confidenceLevel: 'LIKELY_FAIL',
        l5Analyzed: true,
      });
    }
  }

  return findings;
};

/** Type guard for record-shaped objects (used instead of `as` assertions). */
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

/**
 * Parse LLM JSON response into a DocValidationResult.
 * Returns undefined if the response cannot be parsed.
 */
export const parseDocValidationResponse = (
  llmText: string,
  docType: string,
  filePath: string,
  totalElements: number,
): DocValidationResult | undefined => {
  const jsonMatch = llmText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return undefined;

  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    return undefined;
  }
  if (!isRecord(raw)) return undefined;

  const overallScore = typeof raw['overallScore'] === 'number' ? raw['overallScore'] : 50;
  const elements = Array.isArray(raw['elements']) ? raw['elements'] : [];

  const present = elements.filter((e: unknown) => {
    if (!isRecord(e)) return false;
    return e['present'] === true && e['adequate'] === true;
  }).length;

  const missing = elements
    .filter((e: unknown) => {
      if (!isRecord(e)) return true;
      return e['present'] !== true || e['adequate'] !== true;
    })
    .map((e: unknown) => {
      if (!isRecord(e)) return 'unknown';
      return typeof e['id'] === 'string' ? e['id'] : 'unknown';
    });

  const feedback: string[] = [];
  for (const e of elements) {
    if (!isRecord(e)) continue;
    const fb = e['feedback'];
    if (typeof fb === 'string' && fb.length > 0) {
      feedback.push(fb);
    }
  }

  const severity: DocValidationResult['severity'] =
    overallScore < 40 ? 'high' : overallScore < 60 ? 'medium' : overallScore < 80 ? 'low' : 'info';

  return {
    docType,
    file: filePath,
    qualityScore: overallScore,
    elementsPresent: present,
    elementsTotal: totalElements,
    missingElements: missing,
    feedback,
    severity,
  };
};

/**
 * Get checklist for a document type.
 */
export const getChecklist = (docType: string): DocumentChecklist | undefined =>
  DOCUMENT_CHECKLISTS.find((c) => c.docType === docType);

/**
 * Determine document type from file path.
 */
export const detectDocType = (filePath: string): string | undefined => {
  const filename = filePath.split('/').pop()?.toLowerCase() ?? '';
  if (/fria/i.test(filename)) return 'fria';
  if (/tech.*doc|technical.*doc/i.test(filename)) return 'technical-documentation';
  if (/transparency/i.test(filename)) return 'transparency-notice';
  if (/risk.*manage|risk.*assess/i.test(filename)) return 'risk-management';
  return undefined;
};
