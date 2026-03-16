/**
 * Targeted L5: Sends ONLY findings with confidence 50-80% to LLM
 * with structured, obligation-specific questions.
 * Cost: ~$0.01 vs $0.10 for full deep scan.
 */

import type { Finding } from '../../../types/common.types.js';
import type { ImportGraph } from '../import-graph.js';

export interface TargetedL5Config {
  readonly maxFindings: number;      // default 20
  readonly budgetLimit: number;      // max $ per scan, default 0.05
  readonly confidenceMin: number;    // default 50
  readonly confidenceMax: number;    // default 80
}

export interface TargetedL5Prompt {
  readonly findingId: string;
  readonly prompt: string;
  readonly contextFiles: readonly string[];
  readonly estimatedTokens: number;
}

export interface TargetedL5Result {
  readonly findingId: string;
  readonly confirmed: boolean;
  readonly newConfidence: number;
  readonly explanation: string;
  readonly cost: number;
}

const DEFAULT_CONFIG: TargetedL5Config = {
  maxFindings: 20,
  budgetLimit: 0.05,
  confidenceMin: 50,
  confidenceMax: 80,
};

/**
 * Obligation-specific prompt templates.
 * Each template asks a concrete yes/no question about a specific EU AI Act article.
 */
const OBLIGATION_PROMPTS: Record<string, string> = {
  'kill-switch': `L4 scanner found a potential kill switch / emergency stop mechanism.
Question: Does this code implement a genuine kill switch that satisfies EU AI Act Art. 14(4) —
allowing a human to interrupt, stop, or disable the AI system?
A kill switch must: (1) be accessible to authorized personnel, (2) work reliably under all conditions,
(3) not require AI involvement to function.`,

  'disclosure': `L4 scanner found a potential AI disclosure mechanism.
Question: Does this code implement AI disclosure that satisfies EU AI Act Art. 50(1) —
informing natural persons that they are interacting with an AI system?
Disclosure must be: (1) clear and understandable, (2) provided before or at the start of interaction,
(3) include the AI system's capabilities and limitations.`,

  'human-oversight': `L4 scanner found a potential human oversight mechanism.
Question: Does this code implement human oversight that satisfies EU AI Act Art. 14 —
enabling effective human oversight of the AI system during operation?
Oversight must include: (1) ability for human to understand AI decisions, (2) ability to intervene,
(3) ability to override or reverse AI decisions.`,

  'logging': `L4 scanner found a potential interaction logging mechanism.
Question: Does this code implement logging that satisfies EU AI Act Art. 12 —
automatic recording of AI system events (logs) during operation?
Logging must: (1) capture input/output of AI interactions, (2) be traceable,
(3) have defined retention period (≥180 days for high-risk).`,

  'content-marking': `L4 scanner found a potential content marking mechanism.
Question: Does this code implement content marking that satisfies EU AI Act Art. 50(2) —
marking AI-generated content as artificially generated or manipulated?
Marking must be: (1) machine-readable where technically feasible, (2) detectable and interoperable.`,

  'data-governance': `L4 scanner found a potential data governance mechanism.
Question: Does this code implement data governance that satisfies EU AI Act Art. 10 —
ensuring training and validation data meets quality criteria?
Must include: (1) data quality examination, (2) bias assessment, (3) data provenance.`,

  'bare-llm': `L4 scanner detected a potential bare LLM API call without compliance wrapper.
Question: Is this a direct LLM API call without transparency, logging, or safety controls?
A bare call is non-compliant if it: (1) lacks disclosure to users, (2) has no logging,
(3) has no content safety filtering.`,

  'deployer-monitoring': `L4 scanner found a potential deployer monitoring mechanism.
Question: Does this code implement monitoring that satisfies EU AI Act Art. 26(5) —
deployer monitoring of AI system operation and reporting incidents?
Must include: (1) performance monitoring, (2) anomaly detection, (3) incident reporting.`,

  'security-risk': `L4 scanner detected a potential security vulnerability.
Question: Does this code introduce a cybersecurity risk per EU AI Act Art. 15(4)?
Check for: (1) unsafe deserialization, (2) code injection vectors, (3) missing input validation.`,
};

/**
 * Select uncertain findings for targeted L5 analysis.
 */
export const selectUncertainFindings = (
  findings: readonly Finding[],
  config: TargetedL5Config = DEFAULT_CONFIG,
): readonly Finding[] => {
  return findings
    .filter((f) => {
      const conf = f.confidence ?? 50;
      return conf >= config.confidenceMin && conf <= config.confidenceMax;
    })
    .slice(0, config.maxFindings);
};

/**
 * Build structured prompts for targeted L5 analysis.
 * Each prompt is obligation-specific with concrete questions.
 */
export const buildTargetedPrompts = (
  findings: readonly Finding[],
  fileContents: ReadonlyMap<string, string>,
  importGraph?: ImportGraph,
): readonly TargetedL5Prompt[] => {
  return findings.map((finding) => {
    // Determine category for prompt template
    const category = finding.checkId.replace(/^l4-/, '').replace(/-\d+$/, '');
    const template = OBLIGATION_PROMPTS[category] ?? OBLIGATION_PROMPTS['bare-llm'] ?? '';

    // Gather context: the finding's file + its imports from import-graph
    const contextFiles: string[] = [];
    if (finding.file) {
      contextFiles.push(finding.file);

      // Add imported files from import-graph (1 level deep)
      if (importGraph) {
        const node = importGraph.nodes.get(finding.file);
        if (node) {
          for (const imp of node.imports.slice(0, 3)) { // Max 3 related files
            contextFiles.push(imp);
          }
        }
      }
    }

    // Build code context
    const codeSnippets = contextFiles
      .map((file) => {
        const content = fileContents.get(file);
        if (!content) return '';
        // Extract relevant portion (around the finding line, or first 100 lines)
        const lines = content.split('\n');
        const targetLine = finding.line ?? 1;
        const start = Math.max(0, targetLine - 20);
        const end = Math.min(lines.length, targetLine + 30);
        return `--- ${file}:${start + 1}-${end} ---\n${lines.slice(start, end).join('\n')}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const prompt = `${template}

Finding: ${finding.checkId} — ${finding.message}
Severity: ${finding.severity}
Article: ${finding.articleReference ?? 'N/A'}
Current confidence: ${finding.confidence ?? 50}%

Code context:
${codeSnippets || 'No code context available'}

Respond ONLY in this JSON format:
{
  "confirmed": true/false,
  "confidence": 0-100,
  "explanation": "brief explanation why this is/isn't compliant"
}`;

    return {
      findingId: finding.checkId,
      prompt,
      contextFiles,
      estimatedTokens: Math.ceil(prompt.length / 4), // rough estimate
    };
  });
};

/**
 * Apply targeted L5 results back to findings.
 */
export const applyTargetedResults = (
  findings: readonly Finding[],
  results: readonly TargetedL5Result[],
): readonly Finding[] => {
  const resultMap = new Map(results.map((r) => [r.findingId, r]));

  return findings.map((f) => {
    const result = resultMap.get(f.checkId);
    if (!result) return f;

    // If L5 confirms it's a real finding (fail), keep as fail with higher confidence
    if (result.confirmed && f.type === 'fail') {
      return {
        ...f,
        confidence: result.newConfidence,
        confidenceLevel: result.newConfidence >= 95 ? 'FAIL' : 'LIKELY_FAIL',
      };
    }

    // If L5 says it's actually compliant, flip to pass
    if (!result.confirmed && f.type === 'fail') {
      return {
        ...f,
        type: 'pass' as const,
        confidence: result.newConfidence,
        confidenceLevel: result.newConfidence >= 95 ? 'PASS' : 'LIKELY_PASS',
        message: `${f.message} [L5 verified: ${result.explanation}]`,
      };
    }

    // If L5 confirms pass, increase confidence
    if (result.confirmed && f.type === 'pass') {
      return {
        ...f,
        confidence: result.newConfidence,
        confidenceLevel: result.newConfidence >= 95 ? 'PASS' : 'LIKELY_PASS',
      };
    }

    return f;
  });
};

/**
 * Estimate total cost for targeted L5 analysis.
 */
export const estimateTargetedCost = (prompts: readonly TargetedL5Prompt[]): number => {
  // Approximate: $0.003/1K input tokens + $0.015/1K output tokens (Claude Sonnet)
  const inputCost = prompts.reduce((sum, p) => sum + p.estimatedTokens, 0) * 0.003 / 1000;
  const outputCost = prompts.length * 200 * 0.015 / 1000; // ~200 tokens per response
  return Math.round((inputCost + outputCost) * 10000) / 10000;
};
