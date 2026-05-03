/**
 * Core types for the `complior eval` subsystem.
 *
 * Eval sends probes to EXTERNAL AI endpoints (via TargetAdapter) and evaluates
 * responses for EU AI Act compliance. Two probe families:
 *   - 380 conformity tests (CT-1..CT-11, 11 categories)
 *   - 300 security probes (OWASP LLM Top 10)
 */

import { z } from 'zod';
import type { EvalFilterContext, EvalDisclaimer } from '../../types/common.types.js';

// ── Eval Categories (11 conformity areas) ───────────────────────

export const EVAL_CATEGORIES = [
  'transparency',
  'oversight',
  'explanation',
  'bias',
  'accuracy',
  'robustness',
  'prohibited',
  'logging',
  'risk-awareness',
  'gpai',
  'industry',
] as const;

export type EvalCategory = (typeof EVAL_CATEGORIES)[number];

export const EvalCategorySchema = z.enum(EVAL_CATEGORIES);

// ── Category metadata ───────────────────────────────────────────

export interface CategoryMeta {
  readonly id: EvalCategory;
  readonly label: string;
  readonly ctId: string;          // CT-1..CT-11
  readonly euAiActArticles: readonly string[];
  readonly description: string;
}

export const CATEGORY_META: readonly CategoryMeta[] = Object.freeze([
  { id: 'transparency', label: 'Transparency', ctId: 'CT-1', euAiActArticles: ['Art.13', 'Art.52'], description: 'AI system identifies itself and discloses AI nature' },
  { id: 'oversight', label: 'Human Oversight', ctId: 'CT-2', euAiActArticles: ['Art.14'], description: 'Meaningful human control and escalation paths' },
  { id: 'explanation', label: 'Explanation Quality', ctId: 'CT-3', euAiActArticles: ['Art.13(1)', 'Art.86'], description: 'Clear reasoning and decision explanation' },
  { id: 'bias', label: 'Bias & Fairness', ctId: 'CT-4', euAiActArticles: ['Art.10', 'Art.15'], description: 'Equal treatment regardless of protected characteristics' },
  { id: 'accuracy', label: 'Accuracy', ctId: 'CT-5', euAiActArticles: ['Art.15', 'Art.9'], description: 'Factual correctness and hallucination resistance' },
  { id: 'robustness', label: 'Robustness', ctId: 'CT-6', euAiActArticles: ['Art.15', 'Art.9'], description: 'Graceful handling of adversarial and edge-case input' },
  { id: 'prohibited', label: 'Prohibited Practices', ctId: 'CT-7', euAiActArticles: ['Art.5'], description: 'Refusal of social scoring, manipulation, exploitation' },
  { id: 'logging', label: 'Logging & Audit', ctId: 'CT-8', euAiActArticles: ['Art.12', 'Art.19'], description: 'Structured, timestamped, PII-safe audit logs' },
  { id: 'risk-awareness', label: 'Risk Awareness', ctId: 'CT-9', euAiActArticles: ['Art.9'], description: 'Self-awareness of limitations, scope, and failure modes' },
  { id: 'gpai', label: 'GPAI Transparency', ctId: 'CT-10', euAiActArticles: ['Art.52', 'Art.53'], description: 'General-purpose AI model and provider identification' },
  { id: 'industry', label: 'Industry-Specific', ctId: 'CT-11', euAiActArticles: ['Art.6', 'Annex III'], description: 'Domain-specific compliance (HR, education, finance, healthcare)' },
]);

// ── Eval Tier ───────────────────────────────────────────────────

export const EVAL_TIERS = ['basic', 'standard', 'full', 'security'] as const;
export type EvalTier = (typeof EVAL_TIERS)[number];

export const EvalTierSchema = z.enum(EVAL_TIERS);

/** What each tier includes. */
export const TIER_INCLUDES: Record<EvalTier, { deterministic: boolean; llm: boolean; security: boolean }> = {
  basic:    { deterministic: true,  llm: false, security: false },
  standard: { deterministic: false, llm: true,  security: false },
  full:     { deterministic: true,  llm: true,  security: true },
  security: { deterministic: false, llm: false, security: true },
};

// ── Flag-based resolution (replaces tier) ────────────────────

export interface EvalIncludes {
  readonly deterministic: boolean;
  readonly llm: boolean;
  readonly security: boolean;
}

/** Resolve boolean CLI flags into includes (composable: each flag toggles its test set). */
export const resolveIncludes = (opts: { det?: boolean; llm?: boolean; security?: boolean; full?: boolean }): EvalIncludes => {
  if (opts.full) {
    return { deterministic: true, llm: true, security: true };
  }
  // If any explicit flag → compose from flags
  if (opts.det || opts.llm || opts.security) {
    return {
      deterministic: opts.det ?? false,
      llm: opts.llm ?? false,
      security: opts.security ?? false,
    };
  }
  // Default (no flags): deterministic only
  return { deterministic: true, llm: false, security: false };
};

/** Derive a tier label from resolved includes (for display/result). */
export const resolveTierLabel = (includes: EvalIncludes): EvalTier => {
  if (includes.deterministic && includes.llm && includes.security) return 'full';
  if (includes.llm) return 'standard';   // any combo with LLM → standard
  if (includes.security) return 'security';
  return 'basic';
};

// ── Evaluation method ───────────────────────────────────────────

export type EvalMethod = 'deterministic' | 'llm-judge';

// ── Conformity Test ─────────────────────────────────────────────

export interface ConformityTest {
  readonly id: string;            // e.g. "CT-1-001"
  readonly category: EvalCategory;
  readonly name: string;
  readonly description: string;
  readonly method: EvalMethod;
  readonly probe: string;         // Prompt to send to target
  readonly euAiActRef: string;    // e.g. "Art.13(1)"

  // Deterministic eval fields (only when method === 'deterministic')
  readonly passPatterns?: readonly RegExp[];
  readonly failPatterns?: readonly RegExp[];
  readonly checkHeaders?: readonly string[];   // Response headers to check
  readonly checkStatus?: number;               // Expected HTTP status
  readonly maxLatencyMs?: number;              // Max acceptable latency

  // LLM-judge fields (only when method === 'llm-judge')
  readonly judgePrompt?: string;
  readonly scale?: 'binary' | '1-5';
  readonly passThreshold?: number;             // Minimum score to pass (1-5 scale)

  // Multi-turn test support
  readonly followUp?: string;      // Optional follow-up probe
  readonly pairWith?: string;      // For bias A/B pair testing (ID of partner)

  // Metadata
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly tags?: readonly string[];
}

// ── Test Result ─────────────────────────────────────────────────

export interface TestResult {
  readonly testId: string;
  readonly category: EvalCategory;
  readonly name: string;
  readonly method: EvalMethod;
  readonly verdict: 'pass' | 'fail' | 'error' | 'skip' | 'inconclusive';
  readonly score: number;         // 0-100
  readonly confidence: number;    // 0-100
  readonly reasoning: string;
  readonly probe: string;
  readonly response: string;
  readonly latencyMs: number;
  readonly timestamp: string;
  readonly owaspCategory?: string; // OWASP LLM Top 10 (e.g. 'LLM01') — security probes only
  readonly severity?: 'critical' | 'high' | 'medium' | 'low'; // Carried from ConformityTest/probe
}

// ── Category Score ──────────────────────────────────────────────

export interface CategoryScore {
  readonly category: EvalCategory;
  readonly score: number;         // 0-100
  readonly grade: string;         // A-F
  readonly passed: number;
  readonly failed: number;
  readonly errors: number;
  readonly inconclusive: number;
  readonly skipped: number;
  readonly total: number;
}

// ── Eval Result (top-level) ─────────────────────────────────────

export interface EvalResult {
  readonly target: string;
  readonly tier: EvalTier;
  readonly overallScore: number;
  readonly grade: string;
  readonly categories: readonly CategoryScore[];
  readonly securityScore?: number;
  readonly securityGrade?: string;
  readonly results: readonly TestResult[];
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly errors: number;
  readonly inconclusive: number;
  readonly skipped: number;
  readonly duration: number;      // ms
  readonly timestamp: string;
  readonly criticalCapped: boolean;
  readonly agent?: string;        // Agent passport name
  readonly adapterName?: string;  // Target adapter type (openai, anthropic, ollama, http)
  /** V1-M12: Context about how eval tests were filtered based on project profile. */
  readonly filterContext?: EvalFilterContext;
  /** V1-M12: Explains eval score coverage and filtering applied. */
  readonly disclaimer?: EvalDisclaimer;
}

// ── Eval Options (input to runner) ──────────────────────────────

export const EvalOptionsSchema = z.object({
  target: z.string().url(),
  det: z.boolean().optional(),
  llm: z.boolean().optional(),
  security: z.boolean().optional(),
  full: z.boolean().optional(),
  categories: z.array(EvalCategorySchema).optional(),
  agent: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  path: z.string().optional(),
  threshold: z.number().min(0).max(100).optional(),
  json: z.boolean().optional(),
  ci: z.boolean().optional(),
  // Custom adapter fields
  requestTemplate: z.string().optional(),   // JSON template with {{probe}} placeholder
  responsePath: z.string().optional(),      // Dot-path to response text (e.g. "result.text")
  headers: z.string().optional(),           // JSON string of custom headers
  // Concurrency
  concurrency: z.number().int().min(1).max(50).optional(), // Parallel test execution (default: 1)
  // V1-M12: Context-aware eval — profile-based test filtering
  profile: z.object({
    role: z.enum(['provider', 'deployer', 'both']),
    riskLevel: z.string().nullable(),
    domain: z.string().nullable(),
  }).optional(),
});

export type EvalOptions = z.infer<typeof EvalOptionsSchema>;

// ── Audit Options ───────────────────────────────────────────────

export const AuditOptionsSchema = z.object({
  target: z.string().url(),
  agent: z.string().optional(),
  path: z.string().optional(),
  json: z.boolean().optional(),
});

export type AuditOptions = z.infer<typeof AuditOptionsSchema>;

// ── Progress callback ───────────────────────────────────────────

export interface EvalProgress {
  readonly phase: 'health' | 'deterministic' | 'llm-judge' | 'security' | 'scoring' | 'done';
  readonly completed: number;
  readonly total: number;
  readonly currentTest?: string;
  readonly lastResult?: TestResult;
}

export type EvalProgressCallback = (progress: EvalProgress) => void | Promise<void>;
