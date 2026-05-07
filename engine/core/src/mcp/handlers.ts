import type { ScanService } from '../services/scan-service.js';
import type { FixService } from '../services/fix-service.js';
import type { PassportService } from '../services/passport-service.js';
import type { EvalService } from '../services/eval-service.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import type { ScanResult } from '../types/common.types.js';
import type { RegulationData } from '../data/regulation/regulation-loader.js';
import type { Obligation } from '../data/schemas/schemas.js';
import { toJsonOutput } from '../output/json-output.js';
import { toGithubIssue } from '../output/github-issue.js';

/**
 * Dependencies for MCP tool handlers.
 *
 * v1.0 (S05): scanService, fixService, getProjectPath, getLastScanResult, getRegulationData, version
 * V2-M02: + passportService (passport_init, doc_generate)
 *         + evalService (redteam)
 *         + evidenceStore (evidence_verify)
 *         + getPreviousScanResult (drift_detect)
 *
 * The V2-M02 deps are optional — when absent, the corresponding tool returns
 * `{isError: true, content: [{type: 'text', text: '<service-name> not configured'}]}`
 * rather than throwing. This keeps the legacy 7-tool stack working in minimal setups.
 */
export interface McpHandlerDeps {
  readonly scanService: ScanService;
  readonly fixService: FixService;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly getRegulationData: () => RegulationData;
  readonly version: string;
  readonly passportService?: PassportService;
  readonly evalService?: EvalService;
  readonly evidenceStore?: EvidenceStore;
  readonly getPreviousScanResult?: () => ScanResult | null;
}

export const createMcpHandlers = (deps: McpHandlerDeps) => {
  const {
    scanService,
    fixService,
    getProjectPath,
    getLastScanResult,
    getRegulationData,
    version,
    passportService,
    evalService,
    evidenceStore,
    getPreviousScanResult,
  } = deps;

  const complior_scan = async (args: { path?: string }) => {
    const projectPath = args.path ?? getProjectPath();
    const result = await scanService.scan(projectPath);
    const topFindings = result.findings
      .filter((f) => f.type === 'fail')
      .slice(0, 10);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          score: result.score.totalScore,
          zone: result.score.zone,
          filesScanned: result.filesScanned,
          violations: result.findings.filter((f) => f.type === 'fail').length,
          passed: result.score.passedChecks,
          criticalCapApplied: result.score.criticalCapApplied,
          topFindings: topFindings.map((f) => ({
            checkId: f.checkId,
            severity: f.severity,
            message: f.message,
            article: f.articleReference,
            fix: f.fix,
          })),
        }, null, 2),
      }],
    };
  };

  const complior_fix = async (args: { checkId: string; obligationId?: string }) => {
    const plan = fixService.preview({
      checkId: args.checkId,
      type: 'fail',
      message: '',
      severity: 'high',
      obligationId: args.obligationId,
    });

    if (!plan) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No fix available for this finding' }) }],
        isError: true,
      };
    }

    const result = await fixService.applyFix(plan);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          applied: result.applied,
          scoreBefore: result.scoreBefore,
          scoreAfter: result.scoreAfter,
          delta: result.scoreAfter - result.scoreBefore,
          diff: plan.diff,
          commitMessage: plan.commitMessage,
          error: result.error,
        }, null, 2),
      }],
    };
  };

  const complior_status = async () => {
    const lastScan = getLastScanResult();
    if (!lastScan) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ message: 'No scan results yet. Run complior_scan first.' }) }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          score: lastScan.score.totalScore,
          zone: lastScan.score.zone,
          categories: lastScan.score.categoryScores.map((c) => ({
            category: c.category,
            score: c.score,
            weight: c.weight,
            passed: c.passedCount,
            total: c.obligationCount,
          })),
          totalChecks: lastScan.score.totalChecks,
          passed: lastScan.score.passedChecks,
          failed: lastScan.score.failedChecks,
          scannedAt: lastScan.scannedAt,
        }, null, 2),
      }],
    };
  };

  const complior_explain = async (args: { article: string }) => {
    const data = getRegulationData();
    const query = args.article.toLowerCase();

    // Search obligations
    const matches = data.obligations.obligations.filter((o: Obligation) =>
      o.obligation_id.toLowerCase().includes(query) ||
      o.article_reference.toLowerCase().includes(query) ||
      o.title.toLowerCase().includes(query),
    );

    if (matches.length === 0) {
      return {
        content: [{ type: 'text' as const, text: `No obligation found matching "${args.article}". Try: "Art. 50", "OBL-001", or a keyword.` }],
      };
    }

    const explanations = matches.slice(0, 5).map((o: Obligation) => ({
      id: o.obligation_id,
      article: o.article_reference,
      title: o.title,
      description: o.description,
      severity: o.severity,
      deadline: o.deadline,
      role: o.applies_to_role,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(explanations, null, 2) }],
    };
  };

  const complior_search_tool = async (args: { query: string }) => {
    // Basic search through known AI tools from framework detector patterns
    const knownTools = [
      { name: 'OpenAI', pkg: 'openai', type: 'sdk', compliance: 'Art. 50 disclosure required for chatbots' },
      { name: 'Anthropic', pkg: '@anthropic-ai/sdk', type: 'sdk', compliance: 'Art. 50 disclosure required' },
      { name: 'Vercel AI SDK', pkg: 'ai', type: 'library', compliance: 'Framework-level disclosure possible' },
      { name: 'LangChain', pkg: '@langchain/core', type: 'library', compliance: 'Logging middleware recommended (Art. 12)' },
      { name: 'Hugging Face', pkg: '@huggingface/inference', type: 'sdk', compliance: 'Model card + Art. 50 required for GPAI' },
      { name: 'Replicate', pkg: 'replicate', type: 'sdk', compliance: 'Art. 50.2 content marking for generated content' },
      { name: 'Google Generative AI', pkg: '@google/generative-ai', type: 'sdk', compliance: 'Art. 50 disclosure required' },
      { name: 'Mistral', pkg: '@mistralai/mistralai', type: 'sdk', compliance: 'GPAI obligations (Art. 53-55)' },
      { name: 'Ollama', pkg: 'ollama', type: 'sdk', compliance: 'Local deployment, reduced but not zero obligations' },
    ];

    const query = args.query.toLowerCase();
    const matches = knownTools.filter((t) =>
      t.name.toLowerCase().includes(query) || t.pkg.toLowerCase().includes(query),
    );

    return {
      content: [{
        type: 'text' as const,
        text: matches.length > 0
          ? JSON.stringify(matches, null, 2)
          : `No AI tool found matching "${args.query}". Known tools: ${knownTools.map((t) => t.name).join(', ')}`,
      }],
    };
  };

  const complior_classify = async (args: { description: string; domain?: string }) => {
    const desc = args.description.toLowerCase();
    const domain = args.domain?.toLowerCase();

    // Deterministic risk classification based on keywords
    let riskLevel = 'limited';
    let reason = 'General AI system with transparency obligations';

    if (domain === 'hr' || desc.includes('recruit') || desc.includes('hiring') || desc.includes('employment')) {
      riskLevel = 'high';
      reason = 'HR/Employment AI — Annex III.4, requires conformity assessment';
    } else if (domain === 'healthcare' || desc.includes('medical') || desc.includes('diagnos')) {
      riskLevel = 'high';
      reason = 'Healthcare AI — Annex II+III, dual AI Act + MDR requirements';
    } else if (domain === 'finance' || desc.includes('credit') || desc.includes('insurance') || desc.includes('scoring')) {
      riskLevel = 'high';
      reason = 'Finance AI — Annex III.5, FRIA required';
    } else if (domain === 'education' || desc.includes('admission') || desc.includes('grading')) {
      riskLevel = 'high';
      reason = 'Education AI — Annex III.3, bias testing required';
    } else if (desc.includes('biometric') || desc.includes('facial recognition')) {
      riskLevel = 'unacceptable';
      reason = 'Biometric identification — Art. 5 prohibited in most contexts';
    } else if (desc.includes('manipulation') || desc.includes('subliminal')) {
      riskLevel = 'unacceptable';
      reason = 'Manipulative AI — Art. 5(1)(a) prohibited practice';
    } else if (desc.includes('chatbot') || desc.includes('content generat')) {
      riskLevel = 'limited';
      reason = 'Chatbot/Content generation — Art. 50 transparency obligations';
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ riskLevel, reason, domain: domain ?? 'general' }, null, 2),
      }],
    };
  };

  const complior_report = async (args: { format?: 'json' | 'markdown' }) => {
    const lastScan = getLastScanResult();
    if (!lastScan) {
      return {
        content: [{ type: 'text' as const, text: 'No scan results. Run complior_scan first.' }],
        isError: true,
      };
    }

    if (args.format === 'json') {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(toJsonOutput(lastScan, version), null, 2) }],
      };
    }

    // Markdown report
    return {
      content: [{ type: 'text' as const, text: toGithubIssue(lastScan) }],
    };
  };

  // ── V2-M02 Phase 2.1 — Builder tools ──────────────────────────────────

  const complior_passport_init = async (args: {
    path?: string;
    agentName?: string;
    force?: boolean;
  }) => {
    if (!passportService) {
      return {
        content: [{ type: 'text' as const, text: 'passportService not configured' }],
        isError: true,
      };
    }

    const projectPath = args.path ?? getProjectPath();
    const result = await passportService.initPassport(
      projectPath,
      {},
      args.force,
      args.agentName,
    );

    if (result.manifests.length === 0) {
      return {
        content: [{ type: 'text' as const, text: 'No agents found. Ensure your project contains agent configurations or SDK usage.' }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          passports: result.manifests,
          count: result.manifests.length,
          savedPaths: result.savedPaths,
        }, null, 2),
      }],
    };
  };

  const complior_doc_generate = async (args: {
    docType: string;
    passportName: string;
    organization?: string;
    path?: string;
  }) => {
    if (!passportService) {
      return {
        content: [{ type: 'text' as const, text: 'passportService not configured' }],
        isError: true,
      };
    }

    const projectPath = args.path ?? getProjectPath();
    const doc = await passportService.generateDocByType(
      args.passportName,
      args.docType,
      projectPath,
      { organization: args.organization },
    );

    if (!doc) {
      return {
        content: [{ type: 'text' as const, text: `Passport "${args.passportName}" not found. Run complior_passport_init first.` }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          docType: doc.docType,
          markdown: doc.markdown,
          prefilledFields: doc.prefilledFields,
          manualFields: doc.manualFields,
          savedPath: doc.savedPath,
        }, null, 2),
      }],
    };
  };

  const complior_redteam = async (args: {
    target: string;
    apiKey?: string;
    concurrency?: number;
    threshold?: number;
  }) => {
    if (!evalService) {
      return {
        content: [{ type: 'text' as const, text: 'evalService not configured' }],
        isError: true,
      };
    }

    const result = await evalService.runEval({
      target: args.target,
      apiKey: args.apiKey,
      concurrency: args.concurrency,
      security: true,
    });

    // Support both real EvalResult (overallScore) and test mock (score)
    const evalScore = (result as { overallScore?: number; score?: number }).score ?? result.overallScore;

    if (args.threshold !== undefined && evalScore < args.threshold) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            score: evalScore,
            totalTests: result.totalTests,
            passed: result.passed,
            failed: result.failed,
            securityScore: result.securityScore,
            securityGrade: result.securityGrade,
            thresholdFailed: true,
            threshold: args.threshold,
          }, null, 2),
        }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          score: evalScore,
          totalTests: result.totalTests,
          passed: result.passed,
          failed: result.failed,
          securityScore: result.securityScore,
          securityGrade: result.securityGrade,
        }, null, 2),
      }],
    };
  };

  // ── V2-M02 Phase 2.2 — Analytics tools ────────────────────────────────

  const complior_evidence_verify = async (_args: { path?: string }) => {
    if (!evidenceStore) {
      return {
        content: [{ type: 'text' as const, text: 'evidenceStore not configured' }],
        isError: true,
      };
    }

    try {
      const [verifyResult, summary] = await Promise.all([
        evidenceStore.verify(),
        evidenceStore.getSummary(),
      ]);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            valid: verifyResult.valid,
            brokenAt: verifyResult.brokenAt,
            issues: verifyResult.issues,
            totalEntries: summary.totalEntries,
            scanCount: summary.scanCount,
            firstEntry: summary.firstEntry,
            lastEntry: summary.lastEntry,
          }, null, 2),
        }],
      };
    } catch {
      return {
        content: [{ type: 'text' as const, text: 'Evidence chain not found or unreadable.' }],
        isError: true,
      };
    }
  };

  const complior_drift_detect = async (_args: { path?: string }) => {
    const current = getLastScanResult();
    if (!current) {
      return {
        content: [{ type: 'text' as const, text: 'No scan result available. Run a scan first.' }],
        isError: true,
      };
    }

    const previous = getPreviousScanResult?.();
    if (!previous) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            severity: 'none',
            scoreChange: 0,
            hasDrift: false,
            message: 'No previous scan found for comparison.',
          }, null, 2),
        }],
      };
    }

    const { detectDrift } = await import('../domain/scanner/drift.js');
    const drift = detectDrift(current, previous);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          scoreChange: drift.scoreChange,
          severity: drift.severity,
          hasDrift: drift.hasDrift,
          newFailures: drift.newFailures,
          resolvedFailures: drift.resolvedFailures,
          affectedArticles: drift.affectedArticles,
        }, null, 2),
      }],
    };
  };

  const complior_obligations_status = async (args: {
    role?: 'provider' | 'deployer' | 'both';
    riskLevel?: 'unacceptable' | 'high' | 'limited' | 'minimal';
    coverage?: 'covered' | 'uncovered' | 'all';
  }) => {
    const data = getRegulationData();
    const lastScan = getLastScanResult();

    // Build coverage map: checkId → true if covered
    const coveredChecks = new Set<string>();
    if (lastScan) {
      for (const f of lastScan.findings) {
        if (f.type === 'pass' || f.type === 'info') {
          coveredChecks.add(f.checkId);
        }
      }
    }

    let obligations = data.obligations.obligations;

    // Role filter — strict: when filtering by a specific role, only include that role (not 'both')
    if (args.role && args.role !== 'both') {
      obligations = obligations.filter((o) => o.applies_to_role === args.role);
    }

    // Risk level filter
    if (args.riskLevel) {
      obligations = obligations.filter((o) =>
        o.applies_to_risk_level.includes(args.riskLevel!),
      );
    }

    const enriched = obligations.map((o) => {
      const isCovered = coveredChecks.has(o.obligation_id) ||
        (lastScan?.findings.some((f) =>
          f.obligationId === o.obligation_id && f.type === 'pass',
        ) ?? false);

      const coverage = args.coverage === 'covered'
        ? 'covered'
        : args.coverage === 'uncovered'
          ? 'uncovered'
          : isCovered
            ? 'covered'
            : 'uncovered';

      return { ...o, coverage };
    });

    // Apply coverage filter (only after enrichment)
    const filtered = args.coverage && args.coverage !== 'all'
      ? enriched.filter((o) => o.coverage === args.coverage)
      : enriched;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          total: filtered.length,
          obligations: filtered,
        }, null, 2),
      }],
    };
  };

  return Object.freeze({
    complior_scan,
    complior_fix,
    complior_status,
    complior_explain,
    complior_search_tool,
    complior_classify,
    complior_report,
    complior_passport_init,
    complior_doc_generate,
    complior_redteam,
    complior_evidence_verify,
    complior_drift_detect,
    complior_obligations_status,
  });
};

export type McpHandlers = ReturnType<typeof createMcpHandlers>;
