import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import type { Finding, ScanResult } from '../types/common.types.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { Fixer } from '../domain/fixer/create-fixer.js';
import type { FixPlan, FixResult, FixValidation } from '../domain/fixer/types.js';
import type { ScanService } from './scan-service.js';
import type { UndoService } from './undo-service.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import { createEvidence } from '../domain/scanner/evidence.js';
import type { AgentPassport } from '../types/passport.types.js';
import { generateDocument, enrichDocumentWithAI, TEMPLATE_FILE_MAP, type DocType } from '../domain/documents/document-generator.js';
import type { LlmPort } from '../ports/llm.port.js';

export interface FixServiceDeps {
  readonly fixer: Fixer;
  readonly scanService: ScanService;
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly loadTemplate: (templateFile: string) => Promise<string>;
  readonly undoService?: UndoService;
  readonly evidenceStore?: EvidenceStore;
  readonly passportService?: { listPassports: (path?: string) => Promise<readonly AgentPassport[]> };
  readonly llm?: LlmPort;
}

export const createFixService = (deps: FixServiceDeps) => {
  const { fixer, scanService, events, getProjectPath, getLastScanResult, loadTemplate, undoService } = deps;

  const backupFile = async (filePath: string): Promise<string> => {
    const projectPath = getProjectPath();
    const backupDir = resolve(projectPath, '.complior', 'backups');
    await mkdir(backupDir, { recursive: true });
    const timestamp = Date.now();
    const backupPath = resolve(backupDir, `${timestamp}-${filePath.replace(/[\\/]/g, '_')}`);
    try {
      await copyFile(resolve(projectPath, filePath), backupPath);
    } catch {
      // File doesn't exist yet (create action) — no backup needed
    }
    return backupPath;
  };

  const applyAction = async (action: FixPlan['actions'][number], projectPath: string, useAi = false): Promise<void> => {
    const fullPath = resolve(projectPath, action.path);
    await mkdir(dirname(fullPath), { recursive: true });

    if (action.type === 'create') {
      let content = action.content ?? '';
      // Resolve template placeholder — pre-fill with passport data when available
      const templateMatch = content.match(/^\[TEMPLATE:(.+)]$/);
      if (templateMatch) {
        const templateFile = templateMatch[1]!;
        const template = await loadTemplate(templateFile);

        // Reverse-lookup: templateFile → DocType
        const docTypeEntry = (Object.entries(TEMPLATE_FILE_MAP) as [DocType, string][])
          .find(([, file]) => file === templateFile);

        if (docTypeEntry && deps.passportService) {
          try {
            const passports = await deps.passportService.listPassports(projectPath);
            const passport = passports[0];
            if (passport) {
              const baseResult = generateDocument({ manifest: passport, template, docType: docTypeEntry[0] });

              // LLM enrichment when --ai flag is set and LLM is available
              if (useAi && deps.llm && baseResult.manualFields.length > 0) {
                try {
                  const selection = deps.llm.routeModel('document-generation');
                  const model = await deps.llm.getModel(selection.provider, selection.modelId);
                  const enriched = await enrichDocumentWithAI({ baseResult, manifest: passport, model });
                  content = enriched.markdown;
                } catch {
                  content = baseResult.markdown; // LLM failed — use deterministic output
                }
              } else {
                content = baseResult.markdown;
              }
            } else {
              content = template;
            }
          } catch {
            content = template;
          }
        } else {
          content = template;
        }
      }
      await writeFile(fullPath, content, 'utf-8');
      events.emit('file.changed', { path: fullPath, action: 'create' });
    } else {
      const current = await readFile(fullPath, 'utf-8');
      const updated = current.replace(action.oldContent ?? '', action.newContent ?? '');
      await writeFile(fullPath, updated, 'utf-8');
      events.emit('file.changed', { path: fullPath, action: 'edit' });
    }
  };

  const preview = (finding: Finding): FixPlan | null => {
    return fixer.previewFix(finding);
  };

  const previewAll = (): readonly FixPlan[] => {
    const lastScan = getLastScanResult();
    if (!lastScan) return [];
    return fixer.generateFixes(lastScan.findings);
  };

  const applyFix = async (plan: FixPlan, useAi = false): Promise<FixResult> => {
    const projectPath = getProjectPath();
    const scoreBefore = getLastScanResult()?.score.totalScore ?? 0;
    const backedUp: string[] = [];

    try {
      for (const action of plan.actions) {
        const backup = await backupFile(action.path);
        backedUp.push(backup);
        await applyAction(action, projectPath, useAi);
      }

      // Re-scan to get updated score
      const newResult = await scanService.scan(projectPath);
      const scoreAfter = newResult.score.totalScore;

      events.emit('score.updated', { before: scoreBefore, after: scoreAfter });

      // C.R20: Record fix event in evidence chain
      if (deps.evidenceStore) {
        const evidence = createEvidence(
          plan.checkId,
          'fix',
          'fix',
          { file: plan.actions[0]?.path },
        );
        await deps.evidenceStore.append([evidence], randomUUID());
      }

      const result: FixResult = {
        plan,
        applied: true,
        scoreBefore,
        scoreAfter,
        backedUpFiles: backedUp,
      };

      if (undoService) {
        await undoService.recordFix(result, plan);
      }

      return result;
    } catch (err) {
      return {
        plan,
        applied: false,
        scoreBefore,
        scoreAfter: scoreBefore,
        backedUpFiles: backedUp,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };

  const applyAndValidate = async (plan: FixPlan, useAi = false): Promise<FixResult & { validation: FixValidation }> => {
    const lastScan = getLastScanResult();
    const findingBefore = lastScan?.findings.find(
      (f) => f.checkId === plan.checkId && (!plan.obligationId || f.obligationId === plan.obligationId),
    );
    const beforeType = findingBefore?.type ?? 'fail';

    const result = await applyFix(plan, useAi);

    const newScan = getLastScanResult();
    const findingAfter = newScan?.findings.find(
      (f) => f.checkId === plan.checkId && (!plan.obligationId || f.obligationId === plan.obligationId),
    );
    const afterType = findingAfter?.type ?? (result.applied ? 'pass' : beforeType);
    const scoreDelta = result.scoreAfter - result.scoreBefore;

    const validation: FixValidation = {
      checkId: plan.checkId,
      obligationId: plan.obligationId,
      article: plan.article,
      before: beforeType,
      after: afterType,
      scoreDelta,
      totalScore: result.scoreAfter,
    };

    events.emit('fix.validated', {
      checkId: plan.checkId,
      passed: afterType === 'pass',
      scoreDelta,
    });

    return { ...result, validation };
  };

  const applyAllAndValidate = async (useAi = false): Promise<{
    results: readonly (FixResult & { validation: FixValidation })[];
    totalDelta: number;
  }> => {
    const plans = previewAll();
    const results: (FixResult & { validation: FixValidation })[] = [];
    for (const plan of plans) {
      const result = await applyAndValidate(plan, useAi);
      results.push(result);
    }
    const totalDelta = results.reduce((sum, r) => sum + r.validation.scoreDelta, 0);
    return { results, totalDelta };
  };

  const applyAll = async (useAi = false): Promise<readonly FixResult[]> => {
    const plans = previewAll();
    const results: FixResult[] = [];
    for (const plan of plans) {
      const result = await applyFix(plan, useAi);
      results.push(result);
    }
    return results;
  };

  return Object.freeze({ preview, previewAll, applyFix, applyAll, applyAndValidate, applyAllAndValidate });
};

export type FixService = ReturnType<typeof createFixService>;
