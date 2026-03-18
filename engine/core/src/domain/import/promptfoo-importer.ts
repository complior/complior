/**
 * Promptfoo Result Importer.
 * Parses Promptfoo red-team JSON output into our native format.
 * Zero runtime dependency on Promptfoo.
 */

import { z } from 'zod';
import { getOwaspCategoriesForPlugin } from '../../data/security/owasp-llm-top10.js';
import { calculateSecurityScore } from '../scanner/security-score.js';
import type { SecurityScoreResult, TestResultInput } from '../scanner/security-score.js';

// ── Zod schema for Promptfoo JSON output ────────────────────────

const PromptfooAssertionResultSchema = z.object({
  pass: z.boolean(),
  score: z.number().optional(),
  reason: z.string().optional(),
  metric: z.string().optional(),
});

const PromptfooResultSchema = z.object({
  prompt: z.object({
    raw: z.string().optional(),
    label: z.string().optional(),
  }).optional(),
  response: z.object({
    output: z.string().optional(),
  }).optional(),
  vars: z.record(z.unknown()).optional(),
  success: z.boolean(),
  score: z.number().optional(),
  gradingResult: z.object({
    pass: z.boolean(),
    score: z.number().optional(),
    reason: z.string().optional(),
    componentResults: z.array(PromptfooAssertionResultSchema).optional(),
  }).optional(),
  namedScores: z.record(z.number()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const PromptfooOutputSchema = z.object({
  version: z.number().optional(),
  timestamp: z.string().optional(),
  results: z.object({
    results: z.array(PromptfooResultSchema),
    stats: z.object({
      successes: z.number(),
      failures: z.number(),
      tokenUsage: z.object({
        total: z.number().optional(),
        prompt: z.number().optional(),
        completion: z.number().optional(),
      }).optional(),
    }).optional(),
  }),
});

// ── Types ────────────────────────────────────────────────────────

export interface PromptfooImportResult {
  readonly testResults: readonly TestResultInput[];
  readonly securityScore: SecurityScoreResult;
  readonly probesRun: number;
  readonly probesPassed: number;
  readonly probesFailed: number;
  readonly timestamp: string;
}

// ── Importer ─────────────────────────────────────────────────────

/**
 * Import and transform Promptfoo JSON results into our native format.
 * Validates input via Zod, maps results to OWASP categories, calculates security score.
 *
 * @throws {Error} with message starting with "VALIDATION_ERROR:" on invalid input.
 */
export const importFromPromptfoo = (data: unknown): PromptfooImportResult => {
  const parsed = PromptfooOutputSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(`VALIDATION_ERROR: Invalid Promptfoo JSON: ${parsed.error.issues.map((i) => i.message).join(', ')}`);
  }

  const { results: resultWrapper, timestamp } = parsed.data;
  const results = resultWrapper.results;

  const testResults: TestResultInput[] = [];

  for (const result of results) {
    const pass = result.success;
    const verdict: 'pass' | 'fail' = pass ? 'pass' : 'fail';

    // Derive plugin from metadata or namedScores
    const pluginId = extractPluginId(result);
    const categories = pluginId ? getOwaspCategoriesForPlugin(pluginId) : [];
    const category = categories[0];

    testResults.push({
      probeId: pluginId ?? 'unknown',
      owaspCategory: category?.id ?? 'UNCATEGORIZED',
      categoryName: category?.name ?? 'Uncategorized',
      verdict,
      severity: deriveSeverity(category?.severity ?? 'medium'),
    });
  }

  const securityScore = calculateSecurityScore(testResults);

  return Object.freeze({
    testResults: Object.freeze(testResults),
    securityScore,
    probesRun: results.length,
    probesPassed: testResults.filter((t) => t.verdict === 'pass').length,
    probesFailed: testResults.filter((t) => t.verdict === 'fail').length,
    timestamp: timestamp ?? new Date().toISOString(),
  });
};

// ── Helpers ──────────────────────────────────────────────────────

function extractPluginId(result: z.infer<typeof PromptfooResultSchema>): string | undefined {
  // Try metadata.pluginId first
  const meta = result.metadata;
  if (meta && typeof meta['pluginId'] === 'string') {
    return meta['pluginId'];
  }

  // Try namedScores keys (Promptfoo uses plugin names as metric keys)
  if (result.namedScores) {
    const keys = Object.keys(result.namedScores);
    if (keys.length > 0) return keys[0];
  }

  // Try gradingResult metric
  if (result.gradingResult?.componentResults) {
    for (const cr of result.gradingResult.componentResults) {
      if (cr.metric) return cr.metric;
    }
  }

  return undefined;
}

function deriveSeverity(severity: string): string {
  const normalized = severity.toLowerCase();
  if (['critical', 'high', 'medium', 'low', 'info'].includes(normalized)) {
    return normalized;
  }
  return 'medium';
}
