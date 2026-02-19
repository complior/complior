import type { ScanService } from '../services/scan-service.js';
import type { FixService } from '../services/fix-service.js';
import type { ScanResult } from '../types/common.types.js';
import type { RegulationData } from '../data/regulation-loader.js';
import { toJsonOutput } from '../output/json-output.js';
import { toGithubIssue } from '../output/github-issue.js';

export interface McpHandlerDeps {
  readonly scanService: ScanService;
  readonly fixService: FixService;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly getRegulationData: () => RegulationData;
  readonly version: string;
}

export const createMcpHandlers = (deps: McpHandlerDeps) => {
  const { scanService, fixService, getProjectPath, getLastScanResult, getRegulationData, version } = deps;

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
    const matches = data.obligations.obligations.filter((o: any) =>
      o.id?.toLowerCase().includes(query) ||
      o.article?.toLowerCase().includes(query) ||
      o.title?.toLowerCase().includes(query),
    );

    if (matches.length === 0) {
      return {
        content: [{ type: 'text' as const, text: `No obligation found matching "${args.article}". Try: "Art. 50", "OBL-001", or a keyword.` }],
      };
    }

    const explanations = matches.slice(0, 5).map((o: any) => ({
      id: o.id,
      article: o.article,
      title: o.title,
      description: o.description,
      severity: o.severity,
      deadline: o.deadline,
      role: o.role,
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

  return Object.freeze({
    complior_scan,
    complior_fix,
    complior_status,
    complior_explain,
    complior_search_tool,
    complior_classify,
    complior_report,
  });
};

export type McpHandlers = ReturnType<typeof createMcpHandlers>;
