import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { FixService } from '../../services/fix-service.js';
import type { UndoService } from '../../services/undo-service.js';
import type { PassportService } from '../../services/passport-service.js';
import { ValidationError } from '../../types/errors.js';
import { parseBody } from '../utils/validation.js';
import { simulateActions } from '../../domain/whatif/simulate-actions.js';
import { ALL_DOC_TYPES } from '../../domain/documents/document-generator.js';

const FixApplySchema = z.object({
  checkId: z.string().min(1),
  obligationId: z.string().optional(),
  useAi: z.boolean().optional(),
});

const FixApplyAllSchema = z.object({
  useAi: z.boolean().optional(),
  projectPath: z.string().optional(),
});

const FixUndoSchema = z.object({
  id: z.number().optional(),
});

export interface FixRouteDeps {
  readonly fixService: FixService;
  readonly undoService: UndoService;
  readonly passportService?: PassportService;
}

export const createFixRoute = (deps: FixRouteDeps) => {
  const { fixService, undoService, passportService } = deps;
  const app = new Hono();

  // Preview all available fixes (rendered — [TEMPLATE:xxx] replaced with actual markdown)
  app.get('/fix/preview', async (c) => {
    // Use rendered preview if available (full feature), fallback to plain preview
    const renderedPlans = fixService.previewAllRendered !== undefined
      ? await fixService.previewAllRendered()
      : fixService.previewAll();
    const currentScore = fixService.getCurrentScore();
    const lastScan = fixService.getLastScanResult?.() ?? null;
    const findings = lastScan?.findings ?? [];
    const passportCompleteness = fixService.getPassportCompleteness !== undefined
      ? await fixService.getPassportCompleteness()
      : 50;

    const enriched = renderedPlans.map((plan) => {
      const simulation = simulateActions({
        actions: [{ type: 'fix', target: plan.checkId }],
        currentScore,
        findings: findings.map((f) => ({ checkId: f.checkId, severity: f.severity, status: f.type })),
        passportCompleteness,
      });
      return { ...plan, projectedScore: simulation.projectedScore };
    });

    return c.json({ fixes: enriched, count: enriched.length });
  });

  // Preview fix for a specific finding
  app.post('/fix/preview', async (c) => {
    const data = await parseBody(c, FixApplySchema);

    // Look up the actual finding from the last scan so we preserve fixDiff / strategy context
    const allPlans = fixService.previewAll();
    const plan = allPlans.find((p) => p.checkId === data.checkId)
      ?? fixService.preview({
        checkId: data.checkId,
        type: 'fail',
        message: '',
        severity: 'high',
        obligationId: data.obligationId,
      });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No auto-fix available for this finding', recommendation: 'Review and enrich document sections manually, or use --ai flag' }, 404);
    }

    // Add projectedScore for the single fix
    const currentScore = fixService.getCurrentScore();
    const lastScan = fixService.getLastScanResult?.() ?? null;
    const findings = lastScan?.findings ?? [];
    const passportCompleteness = fixService.getPassportCompleteness !== undefined
      ? await fixService.getPassportCompleteness()
      : 50;
    const simulation = simulateActions({
      actions: [{ type: 'fix', target: plan.checkId }],
      currentScore,
      findings: findings.map((f) => ({ checkId: f.checkId, severity: f.severity, status: f.type })),
      passportCompleteness,
    });

    return c.json({ ...plan, projectedScore: simulation.projectedScore });
  });

  // Apply a specific fix
  app.post('/fix/apply', async (c) => {
    const data = await parseBody(c, FixApplySchema);

    const allPlans = fixService.previewAll();
    const plan = allPlans.find((p) => p.checkId === data.checkId)
      ?? fixService.preview({
        checkId: data.checkId,
        type: 'fail',
        message: '',
        severity: 'high',
        obligationId: data.obligationId,
      });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No auto-fix available for this finding', recommendation: 'Review and enrich document sections manually, or use --ai flag' }, 404);
    }

    const result = await fixService.applyFix(plan, data.useAi);
    return c.json(result);
  });

  // Apply a fix and validate the result
  app.post('/fix/apply-and-validate', async (c) => {
    const data = await parseBody(c, FixApplySchema);

    const plan = fixService.preview({
      checkId: data.checkId,
      type: 'fail',
      message: '',
      severity: 'high',
      obligationId: data.obligationId,
    });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No auto-fix available for this finding', recommendation: 'Review and enrich document sections manually, or use --ai flag' }, 404);
    }

    const result = await fixService.applyAndValidate(plan, data.useAi);
    return c.json({ result, validation: result.validation });
  });

  // Apply all available fixes (batch mode)
  app.post('/fix/apply-all', async (c) => {
    const data = await parseBody(c, FixApplyAllSchema);
    const useAi = data.useAi ?? false;
    const results = await fixService.applyAll(useAi, data.projectPath);
    const applied = results.filter((r) => r.applied).length;
    const failed = results.filter((r) => !r.applied).length;
    const currentScore = fixService.getCurrentScore();
    const scoreBefore = results[0]?.scoreBefore ?? currentScore;
    const scoreAfter = results.at(-1)?.scoreAfter ?? currentScore;

    const unfixedFindings = fixService.getUnfixedFindings();
    const lastScan = fixService.getLastScanResult?.() ?? null;

    return c.json({
      results,
      summary: { total: results.length, applied, failed, scoreBefore, scoreAfter },
      unfixedFindings: unfixedFindings.map((f) => ({
        checkId: f.checkId,
        message: f.message,
        severity: f.severity,
        fix: f.fix,
      })),
      /** V1-M08 T-8: filterContext from last scan — helps caller understand applied filter scope */
      filterContext: lastScan?.filterContext ?? null,
    });
  });

  // Apply all fixes with SSE streaming progress
  app.post('/fix/apply-all/stream', async (c) => {
    const data = await parseBody(c, FixApplyAllSchema);
    const useAi = data.useAi ?? false;

    return streamSSE(c, async (stream) => {
      try {
        const plans = fixService.previewAll();
        const currentScore = fixService.getCurrentScore();

        // Emit start event
        await stream.writeSSE({
          event: 'fix:start',
          data: JSON.stringify({ total: plans.length, useAi, scoreBefore: currentScore }),
        });

        // Apply fixes with progress callback
        let index = 0;
        const onProgress = async (event: {
          type: 'applying' | 'applied' | 'failed';
          checkId: string;
          path: string;
          action?: string;
          scoreAfter?: number;
          error?: string;
        }): Promise<void> => {
          if (event.type === 'applying') {
            await stream.writeSSE({
              event: 'fix:progress',
              data: JSON.stringify({
                index, checkId: event.checkId, path: event.path,
                action: event.action ?? 'MODIFY', status: 'applying',
              }),
            });
          } else if (event.type === 'applied') {
            await stream.writeSSE({
              event: 'fix:applied',
              data: JSON.stringify({
                index, checkId: event.checkId, path: event.path,
                scoreAfter: event.scoreAfter,
              }),
            });
            index++;
          } else {
            await stream.writeSSE({
              event: 'fix:failed',
              data: JSON.stringify({ index, checkId: event.checkId, error: event.error }),
            });
            index++;
          }
        };

        // Send heartbeat every 15s to prevent idle timeout during long LLM calls
        const heartbeat = setInterval(async () => {
          try {
            await stream.writeSSE({ event: 'heartbeat', data: JSON.stringify({ ts: Date.now() }) });
          } catch { /* stream may be closed */ }
        }, 15_000);

        let results;
        try {
          results = await fixService.applyAll(useAi, data.projectPath, onProgress);
        } finally {
          clearInterval(heartbeat);
        }

        const applied = results.filter((r) => r.applied).length;
        const failed = results.filter((r) => !r.applied).length;
        const scoreBefore = results[0]?.scoreBefore ?? currentScore;
        const scoreAfter = results.at(-1)?.scoreAfter ?? currentScore;

        const unfixedFindings = fixService.getUnfixedFindings();

        await stream.writeSSE({
          event: 'fix:done',
          data: JSON.stringify({
            summary: { total: results.length, applied, failed, scoreBefore, scoreAfter },
            unfixedFindings: unfixedFindings.map((f) => ({
              checkId: f.checkId, message: f.message, severity: f.severity, fix: f.fix,
            })),
          }),
        });
      } catch (err) {
        await stream.writeSSE({
          event: 'fix:error',
          data: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
        });
      }
    });
  });

  // Undo a fix (last or by id)
  app.post('/fix/undo', async (c) => {
    const data = await parseBody(c, FixUndoSchema);

    const validation = data.id != null
      ? await undoService.undoById(data.id)
      : await undoService.undoLast();

    return c.json({ validation });
  });

  // Get fix history
  app.get('/fix/history', async (c) => {
    const history = await undoService.getHistory();
    return c.json(history);
  });

  // ────────────────────────────────────────────────────────────
  // V1-M11 T-4: Document generation routes (moved from /agent/*)
  // ────────────────────────────────────────────────────────────

  // C.D01: Generate FRIA
  app.post('/fix/doc/fria', async (c) => {
    if (!passportService) throw new ValidationError('Passport service not available');
    const data = await parseBody(c, z.object({
      name: z.string().min(1),
      path: z.string().optional(),
      organization: z.string().optional(),
      assessor: z.string().optional(),
      impact: z.string().optional(),
      mitigation: z.string().optional(),
      approval: z.string().optional(),
    }));

    const result = await passportService.generateFriaReport(
      data.name,
      data.path,
      {
        organization: data.organization,
        assessor: data.assessor,
        impact: data.impact,
        mitigation: data.mitigation,
        approval: data.approval,
      },
    );
    if (result === null) throw new ValidationError(`Passport not found: ${data.name}`);
    return c.json({ ...result });
  });

  // C.D02: Generate Worker Notification (Art.26(7))
  app.post('/fix/doc/notify', async (c) => {
    if (!passportService) throw new ValidationError('Passport service not available');
    const data = await parseBody(c, z.object({
      name: z.string().min(1),
      path: z.string().optional(),
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      deploymentDate: z.string().optional(),
      affectedRoles: z.string().optional(),
      impactDescription: z.string().optional(),
    }));

    const result = await passportService.generateWorkerNotification(
      data.name,
      data.path,
      {
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        deploymentDate: data.deploymentDate,
        affectedRoles: data.affectedRoles,
        impactDescription: data.impactDescription,
      },
    );
    if (result === null) throw new ValidationError(`Passport not found: ${data.name}`);
    return c.json({ path: result.savedPath, markdown: result.markdown, timestamp: new Date().toISOString() });
  });

  // US-S05-15: Generate industry-specific AI usage policy
  app.post('/fix/doc/policy', async (c) => {
    if (!passportService) throw new ValidationError('Passport service not available');
    const VALID_INDUSTRIES = ['hr', 'finance', 'healthcare', 'education', 'legal'] as const;
    const data = await parseBody(c, z.object({
      name: z.string().min(1),
      path: z.string().optional(),
      domain: z.enum(VALID_INDUSTRIES),
      organization: z.string().optional(),
      approver: z.string().optional(),
    }));

    const result = await passportService.generatePolicy(
      data.name,
      data.domain,
      data.path,
      { organization: data.organization, approver: data.approver },
    );
    if (result === null) throw new ValidationError(`Passport not found: ${data.name}`);
    return c.json({ ...result, savedPath: undefined });
  });

  // US-S06-06: Generate a single compliance document by type
  app.post('/fix/doc/generate', async (c) => {
    if (!passportService) throw new ValidationError('Passport service not available');
    const data = await parseBody(c, z.object({
      name: z.string().min(1),
      path: z.string().optional(),
      docType: z.enum(ALL_DOC_TYPES as readonly [string, ...string[]]),
      organization: z.string().optional(),
    }));

    const result = await passportService.generateDocByType(
      data.name,
      data.docType,
      data.path,
      { organization: data.organization },
    );
    if (result === null) throw new ValidationError(`Passport not found: ${data.name}`);
    return c.json({ ...result, timestamp: new Date().toISOString() });
  });

  return app;
};
