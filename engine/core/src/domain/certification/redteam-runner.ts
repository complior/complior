/**
 * Red-Team Runner.
 * Runs security probes against an LLM endpoint and produces a RedteamReport.
 * Extends the test-runner pattern: sequential execution, deterministic evaluation.
 *
 * The LLM is the **subject under test**, not the evaluator.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ATTACK_PROBES, getProbesByCategory } from '../../data/security/attack-probes.js';
import { OWASP_LLM_TOP_10 } from '../../data/security/owasp-llm-top10.js';
import { calculateSecurityScore } from '../scanner/security-score.js';
import { createEvidence } from '../scanner/evidence.js';
import type { SecurityScoreResult, TestResultInput } from '../scanner/security-score.js';
import type { AttackProbe } from '../../data/security/attack-probes.js';
import type { EvidenceStore } from '../scanner/evidence-store.js';
import type { AuditStore } from '../audit/audit-trail.js';
import type { EvaluationResult } from './adversarial/evaluators.js';

// ── Types ────────────────────────────────────────────────────────

export interface RedteamRunnerDeps {
  readonly callLlm: (prompt: string, systemPrompt?: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
  readonly getProjectPath: () => string;
}

export interface RedteamOptions {
  readonly categories?: readonly string[];
  readonly maxProbes?: number;
}

export interface ProbeResult {
  readonly probeId: string;
  readonly pluginId: string;
  readonly owaspCategory: string;
  readonly name: string;
  readonly severity: string;
  readonly verdict: 'pass' | 'fail' | 'inconclusive';
  readonly confidence: number;
  readonly reasoning: string;
  readonly prompt: string;
  readonly response: string;
}

export interface RedteamCategorySummary {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly passed: number;
  readonly failed: number;
  readonly inconclusive: number;
  readonly total: number;
  readonly score: number;
}

export interface RedteamReport {
  readonly agentName: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly probeResults: readonly ProbeResult[];
  readonly securityScore: SecurityScoreResult;
  readonly owaspMapping: Readonly<Record<string, RedteamCategorySummary>>;
  readonly totalProbes: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly inconclusiveCount: number;
}

// ── Factory ──────────────────────────────────────────────────────

export const createRedteamRunner = (deps: RedteamRunnerDeps) => {
  const callLlmSafely = async (prompt: string, systemPrompt?: string): Promise<string> => {
    try {
      return await deps.callLlm(prompt, systemPrompt);
    } catch (err) {
      return `[ERROR] LLM call failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  };

  const runRedteam = async (
    agentName: string,
    options?: RedteamOptions,
  ): Promise<RedteamReport> => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Select probes
    let probes: readonly AttackProbe[];
    if (options?.categories && options.categories.length > 0) {
      probes = options.categories.flatMap((cat) => getProbesByCategory(cat));
    } else {
      probes = ATTACK_PROBES;
    }

    // Apply max probes limit
    if (options?.maxProbes && options.maxProbes > 0) {
      probes = probes.slice(0, options.maxProbes);
    }

    // Run probes sequentially (rate limit safety)
    const probeResults: ProbeResult[] = [];

    for (const probe of probes) {
      const response = await callLlmSafely(probe.prompt);
      const evaluation: EvaluationResult = probe.evaluate(response);

      probeResults.push({
        probeId: probe.id,
        pluginId: probe.pluginId,
        owaspCategory: probe.owaspCategory,
        name: probe.name,
        severity: probe.severity,
        verdict: evaluation.verdict,
        confidence: evaluation.confidence,
        reasoning: evaluation.reasoning,
        prompt: probe.prompt,
        response,
      });
    }

    // Calculate security score
    const testResults: TestResultInput[] = probeResults.map((pr) => ({
      probeId: pr.probeId,
      owaspCategory: pr.owaspCategory,
      categoryName: OWASP_LLM_TOP_10.find((c) => c.id === pr.owaspCategory)?.name ?? pr.owaspCategory,
      verdict: pr.verdict === 'inconclusive' ? 'fail' as const : pr.verdict,
      severity: pr.severity,
    }));

    const securityScore = calculateSecurityScore(testResults);

    // Build OWASP mapping
    const owaspMapping: Record<string, RedteamCategorySummary> = {};
    for (const cat of OWASP_LLM_TOP_10) {
      const catResults = probeResults.filter((pr) => pr.owaspCategory === cat.id);
      if (catResults.length > 0) {
        const passed = catResults.filter((r) => r.verdict === 'pass').length;
        const failed = catResults.filter((r) => r.verdict === 'fail').length;
        const inconclusive = catResults.filter((r) => r.verdict === 'inconclusive').length;
        owaspMapping[cat.id] = {
          categoryId: cat.id,
          categoryName: cat.name,
          passed,
          failed,
          inconclusive,
          total: catResults.length,
          score: catResults.length > 0 ? Math.round((passed / catResults.length) * 100) : 0,
        };
      }
    }

    const passCount = probeResults.filter((r) => r.verdict === 'pass').length;
    const failCount = probeResults.filter((r) => r.verdict === 'fail').length;
    const inconclusiveCount = probeResults.filter((r) => r.verdict === 'inconclusive').length;
    const duration = Date.now() - startTime;

    const report: RedteamReport = Object.freeze({
      agentName,
      timestamp,
      duration,
      probeResults: Object.freeze(probeResults),
      securityScore,
      owaspMapping: Object.freeze(owaspMapping),
      totalProbes: probeResults.length,
      passCount,
      failCount,
      inconclusiveCount,
    });

    // Save report
    const projectPath = deps.getProjectPath();
    const reportsDir = resolve(projectPath, '.complior', 'reports');
    await mkdir(reportsDir, { recursive: true });
    const filename = `redteam-${agentName}-${timestamp.replace(/[:.]/g, '-')}.json`;
    await writeFile(resolve(reportsDir, filename), JSON.stringify(report, null, 2));

    // Record evidence (fire-and-forget)
    if (deps.evidenceStore) {
      const evidence = [
        createEvidence(
          `redteam-${agentName}-${timestamp}`,
          'security',
          'redteam',
          { snippet: `Red-team: ${probeResults.length} probes, score=${securityScore.score}, grade=${securityScore.grade}` },
        ),
      ];
      deps.evidenceStore.append(evidence, `redteam-${timestamp}`).catch(() => {});
    }

    // Audit (fire-and-forget)
    if (deps.auditStore) {
      deps.auditStore.append({
        action: 'redteam.run',
        actor: 'system',
        details: { agentName, probes: probeResults.length, score: securityScore.score, grade: securityScore.grade },
      }).catch(() => {});
    }

    return report;
  };

  return Object.freeze({ runRedteam });
};
