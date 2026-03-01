import type { Finding } from '../../../types/common.types.js';

export type PromptType = 'code_pattern_check' | 'documentation_check' | 'config_check' | 'architecture_check' | 'data_handling_check';

export interface CodeSnippet {
  readonly file: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly content: string;
  readonly relevance: number;
}

export interface L5Result {
  readonly findingId: string;
  readonly originalConfidence: number;
  readonly newConfidence: number;
  readonly verdict: 'pass' | 'fail' | 'uncertain';
  readonly reasoning: string;
  readonly evidence: readonly string[];
  readonly promptType: PromptType;
  readonly cost: number;
}

export interface L5AnalyzerDeps {
  readonly callLlm: (prompt: string) => Promise<{ text: string; inputTokens: number; outputTokens: number }>;
  readonly readFile: (path: string) => Promise<string>;
  readonly calculateCost: (model: string, inputTokens: number, outputTokens: number) => number;
}

const MAX_FINDINGS_PER_SCAN = 20;
const MAX_SNIPPET_LINES = 500;
const UNCERTAIN_MIN = 40;
const UNCERTAIN_MAX = 70;

const PROMPT_KEYWORDS: Record<PromptType, readonly string[]> = {
  data_handling_check: ['data', 'privacy', 'retention', 'biometric', 'consent'],
  code_pattern_check: ['disclosure', 'logging', 'transparency', 'interaction', 'content-marking'],
  documentation_check: ['documentation', 'literacy', 'policy', 'report', 'conformity'],
  config_check: ['config', 'metadata', 'environment', 'deployment'],
  architecture_check: ['monitoring', 'oversight', 'audit', 'kill-switch'],
};

export const selectPromptType = (finding: Finding): PromptType => {
  const text = `${finding.checkId} ${finding.message}`.toLowerCase();

  const isPromptType = (s: string): s is PromptType =>
    s in PROMPT_KEYWORDS;

  for (const [type, keywords] of Object.entries(PROMPT_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw)) && isPromptType(type)) {
      return type;
    }
  }
  return 'code_pattern_check';
};

export const buildL5Prompt = (promptType: PromptType, finding: Finding, snippets: readonly CodeSnippet[]): string => {
  const snippetText = snippets
    .map((s) => `--- ${s.file}:${s.startLine}-${s.endLine} ---\n${s.content}`)
    .join('\n\n');

  const base = `You are a compliance auditor analyzing an AI project for EU AI Act compliance.

Finding: ${finding.checkId} — ${finding.message}
Severity: ${finding.severity}
Article: ${finding.articleReference ?? 'N/A'}
Current confidence: ${finding.confidence ?? 50}%

Analyze the following code snippets and determine if this compliance requirement is met.

${snippetText}

Respond in JSON format:
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "evidence": ["file:line — description"]
}`;

  const typeInstructions: Record<PromptType, string> = {
    code_pattern_check: 'Focus on: implementation patterns, components, middleware, function calls.',
    documentation_check: 'Focus on: document structure, required sections, completeness.',
    config_check: 'Focus on: configuration values, environment variables, security settings.',
    architecture_check: 'Focus on: system design, monitoring, logging, human oversight.',
    data_handling_check: 'Focus on: data flow, storage, consent, retention policies.',
  };

  return `${base}\n\n${typeInstructions[promptType]}`;
};

export const extractSnippets = (
  finding: Finding,
  fileContents: ReadonlyMap<string, string>,
): readonly CodeSnippet[] => {
  const keywords = finding.checkId.split('-').concat(
    finding.message.toLowerCase().split(/\s+/).filter((w) => w.length > 4),
  );

  const snippets: CodeSnippet[] = [];
  let totalLines = 0;

  for (const [file, content] of fileContents) {
    if (totalLines >= MAX_SNIPPET_LINES) break;

    const lines = content.split('\n');
    let relevance = 0;
    const lowerContent = content.toLowerCase();

    for (const kw of keywords) {
      if (lowerContent.includes(kw.toLowerCase())) relevance += 0.2;
    }

    if (relevance > 0) {
      const endLine = Math.min(lines.length, MAX_SNIPPET_LINES - totalLines);
      snippets.push({
        file,
        startLine: 1,
        endLine,
        content: lines.slice(0, endLine).join('\n'),
        relevance: Math.min(1, relevance),
      });
      totalLines += endLine;
    }
  }

  return snippets
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
};

export const createLayer5 = (deps: L5AnalyzerDeps) => {
  const { callLlm, calculateCost } = deps;

  const isUncertain = (finding: Finding): boolean => {
    const confidence = finding.confidence ?? 50;
    return confidence >= UNCERTAIN_MIN && confidence <= UNCERTAIN_MAX;
  };

  const analyzeFindings = async (
    findings: readonly Finding[],
    fileContents: ReadonlyMap<string, string>,
  ): Promise<readonly L5Result[]> => {
    const uncertainFindings = findings.filter(isUncertain).slice(0, MAX_FINDINGS_PER_SCAN);
    const results: L5Result[] = [];

    for (const finding of uncertainFindings) {
      const promptType = selectPromptType(finding);
      const snippets = extractSnippets(finding, fileContents);
      const prompt = buildL5Prompt(promptType, finding, snippets);

      try {
        const response = await callLlm(prompt);
        const cost = calculateCost('claude-sonnet-4', response.inputTokens, response.outputTokens);

        // Parse LLM response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const isRec = (v: unknown): v is Record<string, unknown> =>
            typeof v === 'object' && v !== null;
          const raw: unknown = JSON.parse(jsonMatch[0]);
          const parsed = isRec(raw) ? raw : {};

          const rawVerdict = typeof parsed['verdict'] === 'string' ? parsed['verdict'] : '';
          const verdict = rawVerdict === 'pass' ? 'pass'
            : rawVerdict === 'fail' ? 'fail'
            : 'uncertain';
          const rawEvidence = Array.isArray(parsed['evidence'])
            ? parsed['evidence'].filter((e): e is string => typeof e === 'string')
            : [];
          results.push({
            findingId: finding.checkId,
            originalConfidence: finding.confidence ?? 50,
            newConfidence: typeof parsed['confidence'] === 'number' ? parsed['confidence'] : (finding.confidence ?? 50),
            verdict,
            reasoning: typeof parsed['reasoning'] === 'string' ? parsed['reasoning'] : 'Could not parse LLM response',
            evidence: rawEvidence,
            promptType,
            cost,
          });
        } else {
          results.push({
            findingId: finding.checkId,
            originalConfidence: finding.confidence ?? 50,
            newConfidence: finding.confidence ?? 50,
            verdict: 'uncertain',
            reasoning: 'Could not parse LLM response',
            evidence: [],
            promptType,
            cost,
          });
        }
      } catch {
        // On error, keep original status
        results.push({
          findingId: finding.checkId,
          originalConfidence: finding.confidence ?? 50,
          newConfidence: finding.confidence ?? 50,
          verdict: 'uncertain',
          reasoning: 'LLM analysis failed',
          evidence: [],
          promptType,
          cost: 0,
        });
      }
    }

    return results;
  };

  const applyResults = (
    findings: readonly Finding[],
    l5Results: readonly L5Result[],
  ): readonly Finding[] => {
    const resultMap = new Map(l5Results.map((r) => [r.findingId, r]));

    return findings.map((f) => {
      const result = resultMap.get(f.checkId);
      if (!result) return f;

      return {
        ...f,
        type: result.verdict === 'pass' ? 'pass' : result.verdict === 'fail' ? 'fail' : f.type,
        confidence: result.newConfidence,
        confidenceLevel: result.newConfidence >= 95 ? 'PASS'
          : result.newConfidence >= 70 ? 'LIKELY_PASS'
          : result.newConfidence >= 40 ? 'UNCERTAIN'
          : result.newConfidence >= 5 ? 'LIKELY_FAIL'
          : 'FAIL',
        severity: result.verdict === 'pass' ? 'info' : f.severity,
      };
    });
  };

  const getTotalCost = (results: readonly L5Result[]): number =>
    results.reduce((sum, r) => sum + r.cost, 0);

  return Object.freeze({
    isUncertain,
    analyzeFindings,
    applyResults,
    getTotalCost,
    selectPromptType,
    extractSnippets,
    buildL5Prompt,
  });
};

export type Layer5Analyzer = ReturnType<typeof createLayer5>;
