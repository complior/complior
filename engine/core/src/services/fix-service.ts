import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { backupFile } from './shared/backup.js';
import type { Finding, ScanResult } from '../types/common.types.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { Fixer } from '../domain/fixer/create-fixer.js';
import type { FixPlan, FixResult, FixValidation } from '../domain/fixer/types.js';
import type { ScanService } from './scan-service.js';
import type { UndoService } from './undo-service.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import { createEvidence } from '../domain/scanner/evidence.js';
import { computeCompleteness } from '../domain/passport/passport-validator.js';
import type { AgentPassport } from '../types/passport.types.js';
import { generateDocument, TEMPLATE_FILE_MAP, type DocType, type DocResult } from '../domain/documents/document-generator.js';
import { enrichDocumentWithAI, detectWeakSections } from '../domain/documents/ai-enricher.js';
import type { LlmPort } from '../ports/llm.port.js';

/** Resolve [PASSPORT:field] tokens from agent passport data. */
function resolvePassportPlaceholders(content: string, passport: AgentPassport): string {
  const fields: Record<string, string | undefined> = {
    'display_name': passport.display_name ?? passport.name,
    'name': passport.name,
    'description': passport.description,
    'owner.team': passport.owner?.team,
    'owner.contact': passport.owner?.contact,
    'owner.responsible_person': passport.owner?.responsible_person,
    'model.provider': passport.model?.provider,
    'model.model_id': passport.model?.model_id,
    'risk_class': passport.compliance?.eu_ai_act?.risk_class,
    'autonomy_level': passport.autonomy_level,
    'disclosure_text': passport.disclosure?.disclosure_text,
  };

  return content.replace(/\[PASSPORT:([^\]]+)\]/g, (match, key: string) => {
    return fields[key] ?? match;
  });
}

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
  const { fixer, scanService, events, getProjectPath: _getProjectPath, getLastScanResult, loadTemplate, undoService } = deps;

  const getProjectPath = () => _getProjectPath();

  const createBackup = (filePath: string): Promise<string> =>
    backupFile(filePath, getProjectPath());

  const applyAction = async (action: FixPlan['actions'][number], projectPath: string, useAi = false): Promise<readonly string[] | undefined> => {
    const fullPath = resolve(projectPath, action.path);
    await mkdir(dirname(fullPath), { recursive: true });

    if (action.type === 'create') {
      let content = action.content ?? '';
      let manualFields: readonly string[] | undefined;
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
              // Check if file already exists on disk — enhance existing instead of overwriting
              let existingContent: string | undefined;
              try { existingContent = await readFile(fullPath, 'utf-8'); } catch { /* file doesn't exist */ }

              if (existingContent && existingContent.trim().length > 0) {
                if (useAi && deps.llm) {
                  // Existing doc + --ai: enhance with L2-informed LLM feedback (preserve user edits)
                  const weakSections = detectWeakSections(existingContent);
                  const baseResult: DocResult = {
                    markdown: existingContent,
                    docType: docTypeEntry[0],
                    prefilledFields: [],
                    manualFields: [...weakSections],
                  };
                  manualFields = weakSections;

                  if (weakSections.length > 0) {
                    try {
                      const selection = deps.llm.routeModel('document-generation');
                      const model = await deps.llm.getModel(selection.provider, selection.modelId);
                      const enriched = await enrichDocumentWithAI({ baseResult, manifest: passport, model });
                      // Second pass: re-check for remaining weak sections and enrich again
                      let finalMarkdown = enriched.markdown;
                      const remainingWeak = detectWeakSections(finalMarkdown);
                      if (remainingWeak.length > 0) {
                        try {
                          const secondPass = await enrichDocumentWithAI({
                            baseResult: { markdown: finalMarkdown, docType: docTypeEntry[0], prefilledFields: [], manualFields: [...remainingWeak] },
                            manifest: passport,
                            model,
                          });
                          finalMarkdown = secondPass.markdown;
                        } catch {
                          // Keep first-pass result on second-pass failure
                        }
                      }
                      // Remove scaffold marker after successful LLM enrichment — scanner upgrades to 'draft'
                      content = finalMarkdown.replace(/^<!-- COMPLIOR:SCAFFOLD -->\n/, '');
                    } catch (err) {
                      events.emit('log', { level: 'warn', message: `LLM enrichment failed: ${err instanceof Error ? err.message : err}` });
                      content = existingContent; // LLM failed — keep existing
                    }
                  } else {
                    content = existingContent; // All sections adequate — no changes needed
                  }
                } else {
                  // Existing doc without --ai: keep existing content, never overwrite with scaffold
                  content = existingContent;
                  manualFields = detectWeakSections(existingContent);
                }
              } else {
                // No existing file — generate fresh scaffold
                const baseResult = generateDocument({ manifest: passport, template, docType: docTypeEntry[0] });
                manualFields = baseResult.manualFields;

                // LLM enrichment for fresh scaffold
                if (useAi && deps.llm && baseResult.manualFields.length > 0) {
                  try {
                    const selection = deps.llm.routeModel('document-generation');
                    const model = await deps.llm.getModel(selection.provider, selection.modelId);
                    const enriched = await enrichDocumentWithAI({ baseResult, manifest: passport, model });
                    // Second pass: re-check for remaining weak sections and enrich again
                    let finalMarkdown = enriched.markdown;
                    const remainingWeak = detectWeakSections(finalMarkdown);
                    if (remainingWeak.length > 0) {
                      try {
                        const secondPass = await enrichDocumentWithAI({
                          baseResult: { markdown: finalMarkdown, docType: docTypeEntry[0], prefilledFields: [], manualFields: [...remainingWeak] },
                          manifest: passport,
                          model,
                        });
                        finalMarkdown = secondPass.markdown;
                      } catch {
                        // Keep first-pass result on second-pass failure
                      }
                    }
                    // LLM enriched → no scaffold marker (scanner classifies as 'draft')
                    content = finalMarkdown;
                  } catch (err) {
                    events.emit('log', { level: 'warn', message: `LLM enrichment failed: ${err instanceof Error ? err.message : err}` });
                    content = `<!-- COMPLIOR:SCAFFOLD -->\n${baseResult.markdown}`;
                  }
                } else {
                  // No LLM → mark as scaffold
                  content = `<!-- COMPLIOR:SCAFFOLD -->\n${baseResult.markdown}`;
                }
              }
            } else {
              content = `<!-- COMPLIOR:SCAFFOLD -->\n${template}`;
            }
          } catch {
            content = `<!-- COMPLIOR:SCAFFOLD -->\n${template}`;
          }
        } else {
          content = `<!-- COMPLIOR:SCAFFOLD -->\n${template}`;
        }
      }
      // Resolve [PASSPORT:*] tokens from agent passport (for non-template content)
      if (content.includes('[PASSPORT:') && deps.passportService) {
        try {
          const passports = await deps.passportService.listPassports(projectPath);
          const passport = passports[0];
          if (passport) {
            content = resolvePassportPlaceholders(content, passport);
          }
        } catch { /* ignore — keep placeholders */ }
      }
      await writeFile(fullPath, content, 'utf-8');
      events.emit('file.changed', { path: fullPath, action: 'create' });
      return manualFields;
    } else if (action.type === 'splice') {
      const content = await readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      const startIdx = (action.startLine ?? 1) - 1;
      const beforeLines = action.beforeLines ?? [];
      const endIdx = startIdx + beforeLines.length;

      // Stale diff protection — validate before-lines match (trimmed)
      if (endIdx > lines.length) {
        throw new Error(`Stale diff: line range exceeds file length — re-scan first`);
      }
      for (let i = 0; i < beforeLines.length; i++) {
        if ((lines[startIdx + i] ?? '').trim() !== (beforeLines[i] ?? '').trim()) {
          throw new Error(`Stale diff at line ${(action.startLine ?? 1) + i} — re-scan first`);
        }
      }

      // Splice: replace before-lines with after-lines
      lines.splice(startIdx, beforeLines.length, ...(action.afterLines ?? []));

      // Import injection — after last existing import, or at top
      if (action.importLine && !lines.some((l) => l.includes(action.importLine!))) {
        let insertAt = 0;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i]!.startsWith('import ')) { insertAt = i + 1; break; }
        }
        lines.splice(insertAt, 0, action.importLine);
      }

      // Write back, preserving trailing newline
      let output = lines.join('\n');
      if (content.endsWith('\n') && !output.endsWith('\n')) output += '\n';
      await writeFile(fullPath, output, 'utf-8');
      events.emit('file.changed', { path: fullPath, action: 'edit' });
      return undefined;
    } else {
      const current = await readFile(fullPath, 'utf-8');
      const updated = current.replace(action.oldContent ?? '', action.newContent ?? '');
      await writeFile(fullPath, updated, 'utf-8');
      events.emit('file.changed', { path: fullPath, action: 'edit' });
      return undefined;
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

  /** Like previewAll but renders [TEMPLATE:xxx] markers to actual markdown content. */
  const previewAllRendered = async (): Promise<readonly FixPlan[]> => {
    const plans = previewAll();
    if (plans.length === 0) return [];

    // Load all passports for placeholder resolution (once)
    let passports: readonly AgentPassport[] = [];
    if (deps.passportService) {
      try { passports = await deps.passportService.listPassports(getProjectPath()); } catch { /* ignore */ }
    }
    const passport = passports[0] ?? null;

    const renderedPlans: FixPlan[] = [];

    for (const plan of plans) {
      const renderedActions = await Promise.all(
        plan.actions.map(async (action) => {
          if (action.type !== 'create' || !action.content) return action;

          let content = action.content;
          const templateMatch = content.match(/^\[TEMPLATE:(.+)]$/);
          if (templateMatch) {
            const templateFile = templateMatch[1]!;
            try {
              const template = await loadTemplate(templateFile);
              const docTypeEntry = (Object.entries(TEMPLATE_FILE_MAP) as [DocType, string][])
                .find(([, file]) => file === templateFile);
              if (docTypeEntry) {
                const baseResult = generateDocument({ manifest: passport, template, docType: docTypeEntry[0] });
                content = baseResult.markdown;
              } else {
                content = template;
              }
            } catch {
              content = action.content; // keep original on error
            }
          }

          // Resolve [PASSPORT:*] tokens
          if (passport && content.includes('[PASSPORT:')) {
            content = resolvePassportPlaceholders(content, passport);
          }

          return { ...action, content };
        }),
      );
      renderedPlans.push({ ...plan, actions: renderedActions });
    }

    return renderedPlans;
  };

  const applyFix = async (plan: FixPlan, useAi = false): Promise<FixResult> => {
    const projectPath = getProjectPath();
    // Normalize: run a basic scan first so scoreBefore matches scoreAfter tier
    const baselineScan = await scanService.scan(projectPath);
    const scoreBefore = baselineScan.score.totalScore;
    const backedUp: string[] = [];

    try {
      let manualFields: readonly string[] | undefined;
      for (const action of plan.actions) {
        const bk = await createBackup(action.path);
        backedUp.push(bk);
        const mf = await applyAction(action, projectPath, useAi);
        if (mf) manualFields = mf;
      }
      const enrichedPlan = manualFields ? { ...plan, manualFields } : plan;

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
        plan: enrichedPlan,
        applied: true,
        scoreBefore,
        scoreAfter,
        backedUpFiles: backedUp,
      };

      if (undoService) {
        await undoService.recordFix(result, enrichedPlan);
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

  type FixProgressCallback = (event: {
    type: 'applying' | 'applied' | 'failed';
    checkId: string;
    path: string;
    action?: string;
    scoreAfter?: number;
    error?: string;
  }) => Promise<void>;

  const applyAll = async (useAi = false, overridePath?: string, onProgress?: FixProgressCallback): Promise<readonly FixResult[]> => {
    const plans = fixer.generateFixes(
      getLastScanResult()?.findings ?? [],
      useAi ? { useAi: true } : undefined,
    );
    if (plans.length === 0) return [];

    const projectPath = overridePath ?? getProjectPath();
    // Normalize: ensure scoreBefore reflects basic scan (same tier as scoreAfter)
    const baselineScan = await scanService.scan(projectPath);
    const scoreBefore = baselineScan.score.totalScore;
    const results: FixResult[] = [];
    const appliedActionKeys = new Set<string>(); // Track path:startLine (splice) or path (create/edit)

    // Separate splice-only plans (batch per file) from others (apply individually)
    const splicePlans: FixPlan[] = [];
    const otherPlans: FixPlan[] = [];
    for (const plan of plans) {
      if (plan.actions.length === 1 && plan.actions[0]!.type === 'splice') {
        splicePlans.push(plan);
      } else {
        otherPlans.push(plan);
      }
    }

    // Phase 1a: Apply non-splice plans individually
    for (const plan of otherPlans) {
      const backedUp: string[] = [];
      const actionPath = plan.actions[0]?.path ?? '?';
      const actionType = plan.actions[0]?.type === 'create' ? 'CREATE' : 'MODIFY';
      if (onProgress) {
        await onProgress({ type: 'applying', checkId: plan.checkId, path: actionPath, action: actionType });
      }
      try {
        let manualFields: readonly string[] | undefined;
        for (const action of plan.actions) {
          const bk = await createBackup(action.path);
          backedUp.push(bk);
          const mf = await applyAction(action, projectPath, useAi);
          if (mf) manualFields = mf;
        }
        const enrichedPlan = manualFields ? { ...plan, manualFields } : plan;
        for (const action of plan.actions) {
          appliedActionKeys.add(action.type === 'splice' ? `${action.path}:${action.startLine}` : action.path);
        }
        results.push({ plan: enrichedPlan, applied: true, scoreBefore, scoreAfter: 0, backedUpFiles: backedUp });
        if (onProgress) {
          await onProgress({ type: 'applied', checkId: plan.checkId, path: actionPath });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({
          plan,
          applied: false,
          scoreBefore,
          scoreAfter: scoreBefore,
          backedUpFiles: backedUp,
          error: errorMsg,
        });
        if (onProgress) {
          await onProgress({ type: 'failed', checkId: plan.checkId, path: actionPath, error: errorMsg });
        }
      }
    }

    // Phase 1b: Batch same-file splices — single read-modify-write per file
    const fileGroups = new Map<string, FixPlan[]>();
    for (const plan of splicePlans) {
      const path = plan.actions[0]!.path;
      if (!fileGroups.has(path)) fileGroups.set(path, []);
      fileGroups.get(path)!.push(plan);
    }

    for (const [filePath, group] of fileGroups) {
      // Sort bottom-up by startLine so splicing doesn't shift indices for remaining ops
      group.sort((a, b) => (b.actions[0]!.startLine ?? 0) - (a.actions[0]!.startLine ?? 0));

      const bk = await createBackup(filePath);
      const fullPath = resolve(projectPath, filePath);

      let content: string;
      try {
        content = await readFile(fullPath, 'utf-8');
      } catch {
        for (const plan of group) {
          results.push({
            plan, applied: false, scoreBefore, scoreAfter: scoreBefore,
            backedUpFiles: [bk], error: `File not found: ${filePath}`,
          });
        }
        continue;
      }

      const lines = content.split('\n');
      const importLines: string[] = [];

      // Apply each splice to in-memory lines (bottom-up)
      for (const plan of group) {
        const action = plan.actions[0]!;
        const startIdx = (action.startLine ?? 1) - 1;
        const beforeLines = action.beforeLines ?? [];

        // Validate before-lines against current in-memory state
        let valid = true;
        if (startIdx + beforeLines.length > lines.length) {
          results.push({
            plan, applied: false, scoreBefore, scoreAfter: scoreBefore,
            backedUpFiles: [bk], error: `Stale diff: line range exceeds file length — re-scan first`,
          });
          valid = false;
        } else {
          for (let i = 0; i < beforeLines.length; i++) {
            if ((lines[startIdx + i] ?? '').trim() !== (beforeLines[i] ?? '').trim()) {
              results.push({
                plan, applied: false, scoreBefore, scoreAfter: scoreBefore,
                backedUpFiles: [bk], error: `Stale diff at line ${(action.startLine ?? 1) + i} — re-scan first`,
              });
              valid = false;
              break;
            }
          }
        }
        if (!valid) continue;

        if (onProgress) {
          await onProgress({ type: 'applying', checkId: plan.checkId, path: action.path, action: 'MODIFY' });
        }

        // Splice in-memory
        lines.splice(startIdx, beforeLines.length, ...(action.afterLines ?? []));
        if (action.importLine) importLines.push(action.importLine);
        appliedActionKeys.add(`${action.path}:${action.startLine}`);
        results.push({ plan, applied: true, scoreBefore, scoreAfter: 0, backedUpFiles: [bk] });

        if (onProgress) {
          await onProgress({ type: 'applied', checkId: plan.checkId, path: action.path });
        }
      }

      // Inject unique imports after all splices (after last import/from line)
      const uniqueImports = [...new Set(importLines)].filter(
        (imp) => !lines.some((l) => l.includes(imp)),
      );
      if (uniqueImports.length > 0) {
        let insertAt = 0;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i]!.startsWith('import ') || lines[i]!.startsWith('from ')) {
            insertAt = i + 1;
            break;
          }
        }
        lines.splice(insertAt, 0, ...uniqueImports);
      }

      // Write file once
      let output = lines.join('\n');
      if (content.endsWith('\n') && !output.endsWith('\n')) output += '\n';
      await writeFile(fullPath, output, 'utf-8');
      events.emit('file.changed', { path: fullPath, action: 'edit' });
    }

    // Phase 2: Iterative scan+fix (up to 2 extra passes for cascading findings)
    // After fixing line N, the scanner may detect line N+2 which was previously shadowed.
    let scoreAfter = 0;
    for (let pass = 0; pass < 3; pass++) {
      const scanResult = await scanService.scan(projectPath);
      scoreAfter = scanResult.score.totalScore;

      if (pass >= 2) break; // Last pass is just the final scan

      // Check for new fixable findings (splice + cascading create/edit)
      const newPlans = previewAll().filter((p) => {
        if (p.actions.length === 0) return false;
        const a = p.actions[0]!;
        const key = a.type === 'splice' ? `${a.path}:${a.startLine}` : a.path;
        return !appliedActionKeys.has(key);
      });
      if (newPlans.length === 0) break;

      // Apply new splice fixes using the same batched approach
      const spliceCascadePlans = newPlans.filter(p => p.actions.length === 1 && p.actions[0]!.type === 'splice');
      const newFileGroups = new Map<string, FixPlan[]>();
      for (const plan of spliceCascadePlans) {
        const path = plan.actions[0]!.path;
        if (!newFileGroups.has(path)) newFileGroups.set(path, []);
        newFileGroups.get(path)!.push(plan);
      }

      let anyApplied = false;
      for (const [fp, group] of newFileGroups) {
        group.sort((a, b) => (b.actions[0]!.startLine ?? 0) - (a.actions[0]!.startLine ?? 0));
        const bk = await createBackup(fp);
        const full = resolve(projectPath, fp);
        let content: string;
        try { content = await readFile(full, 'utf-8'); } catch { continue; }
        const lines = content.split('\n');
        const importLines: string[] = [];

        for (const plan of group) {
          const action = plan.actions[0]!;
          const startIdx = (action.startLine ?? 1) - 1;
          const beforeLines = action.beforeLines ?? [];
          let valid = true;
          if (startIdx + beforeLines.length > lines.length) { valid = false; }
          else {
            for (let i = 0; i < beforeLines.length; i++) {
              if ((lines[startIdx + i] ?? '').trim() !== (beforeLines[i] ?? '').trim()) { valid = false; break; }
            }
          }
          if (!valid) continue;
          lines.splice(startIdx, beforeLines.length, ...(action.afterLines ?? []));
          if (action.importLine) importLines.push(action.importLine);
          appliedActionKeys.add(`${action.path}:${action.startLine}`);
          results.push({ plan, applied: true, scoreBefore, scoreAfter: 0, backedUpFiles: [bk] });
          anyApplied = true;
        }

        const uniqueImports = [...new Set(importLines)].filter((imp) => !lines.some((l) => l.includes(imp)));
        if (uniqueImports.length > 0) {
          let insertAt = 0;
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i]!.startsWith('import ') || lines[i]!.startsWith('from ')) { insertAt = i + 1; break; }
          }
          lines.splice(insertAt, 0, ...uniqueImports);
        }
        let output = lines.join('\n');
        if (content.endsWith('\n') && !output.endsWith('\n')) output += '\n';
        await writeFile(full, output, 'utf-8');
        events.emit('file.changed', { path: full, action: 'edit' });
      }
      // Apply non-splice cascading actions (create/edit) using existing applyAction helper
      const nonSplicePlans = newPlans.filter(p => p.actions.length > 0 && p.actions[0]!.type !== 'splice');
      for (const plan of nonSplicePlans) {
        try {
          const bk = await createBackup(plan.actions[0]!.path);
          await applyAction(plan.actions[0]!, projectPath);
          appliedActionKeys.add(plan.actions[0]!.path);
          results.push({ plan, applied: true, scoreBefore, scoreAfter: 0, backedUpFiles: [bk] });
          anyApplied = true;
        } catch { /* skip failed cascading fixes */ }
      }
      if (!anyApplied) break;
    }
    events.emit('score.updated', { before: scoreBefore, after: scoreAfter });

    // Phase 3: Record undo history + evidence for applied fixes
    for (const result of results) {
      if (!result.applied) continue;
      // Patch final score into result (reconstruct to preserve readonly contract)
      Object.assign(result, { scoreAfter });

      if (undoService) {
        await undoService.recordFix(result, result.plan);
      }
      if (deps.evidenceStore) {
        const evidence = createEvidence(
          result.plan.checkId,
          'fix',
          'fix',
          { file: result.plan.actions[0]?.path },
        );
        await deps.evidenceStore.append([evidence], randomUUID());
      }
    }

    return results;
  };

  const getUnfixedFindings = (): readonly Finding[] => {
    const lastScan = getLastScanResult();
    if (!lastScan) return [];
    const fixableIds = new Set(previewAll().map((p) => p.checkId));
    return lastScan.findings.filter(
      (f) => f.type === 'fail' && !fixableIds.has(f.checkId),
    );
  };

  const getCurrentScore = (): number => {
    const lastScan = getLastScanResult();
    return lastScan?.score.totalScore ?? 0;
  };

  /** Returns passport completeness (0–100) or 50 as fallback if no passports. */
  const getPassportCompleteness = async (): Promise<number> => {
    if (!deps.passportService) return 50;
    try {
      const passports = await deps.passportService.listPassports(getProjectPath());
      if (passports.length === 0) return 50;
      const completions = passports.map((p) => computeCompleteness(p).score);
      return Math.round(completions.reduce((a, b) => a + b, 0) / completions.length);
    } catch {
      return 50;
    }
  };

  return Object.freeze({ preview, previewAll, previewAllRendered, applyFix, applyAll, applyAndValidate, applyAllAndValidate, getUnfixedFindings, getCurrentScore, getLastScanResult, getPassportCompleteness });
};

export type FixService = ReturnType<typeof createFixService>;
