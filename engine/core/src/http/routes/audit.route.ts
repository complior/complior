/**
 * Audit Route — combined scan + eval + security assessment.
 *
 * POST /audit/run — Run comprehensive audit (scan + eval combined)
 */

import { Hono } from 'hono';
import type { EvalService } from '../../services/eval-service.js';
import type { ScanService } from '../../services/scan-service.js';
import { AuditOptionsSchema } from '../../domain/eval/types.js';
import { parseBody } from '../utils/validation.js';

export interface AuditRouteDeps {
  readonly evalService: EvalService;
  readonly scanService: ScanService;
  readonly getProjectPath: () => string;
}

export const createAuditRoute = (deps: AuditRouteDeps) => {
  const app = new Hono();

  // POST /audit/run — combined scan + eval
  app.post('/audit/run', async (c) => {
    const parsed = await parseBody(c, AuditOptionsSchema);

    const projectPath = parsed.path ?? deps.getProjectPath();

    // Step 1: Static scan
    const scanResult = await deps.scanService.scan(projectPath);

    // Step 2: Dynamic eval (full = all tests + security)
    const evalResult = await deps.evalService.runEval({
      target: parsed.target,
      full: true,
      agent: parsed.agent,
    });

    // Step 3: Combined result
    const auditResult = {
      scan: {
        score: scanResult.score.totalScore,
        grade: scanResult.score.grade,
        findings: scanResult.findings.length,
      },
      eval: {
        score: evalResult.overallScore,
        grade: evalResult.grade,
        tests: evalResult.totalTests,
        passed: evalResult.passed,
        failed: evalResult.failed,
        securityScore: evalResult.securityScore,
        securityGrade: evalResult.securityGrade,
      },
      combined: {
        // Weighted: 40% scan + 60% eval
        score: Math.round(scanResult.score.totalScore * 0.4 + evalResult.overallScore * 0.6),
        timestamp: new Date().toISOString(),
        agent: parsed.agent,
      },
    };

    return c.json(auditResult);
  });

  return app;
};
