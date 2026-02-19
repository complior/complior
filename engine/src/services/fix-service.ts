import { resolve, dirname } from 'node:path';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import type { Finding, ScanResult } from '../types/common.types.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { Fixer } from '../domain/fixer/create-fixer.js';
import type { FixPlan, FixResult } from '../domain/fixer/types.js';
import type { ScanService } from './scan-service.js';

export interface FixServiceDeps {
  readonly fixer: Fixer;
  readonly scanService: ScanService;
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly loadTemplate: (templateFile: string) => Promise<string>;
}

export const createFixService = (deps: FixServiceDeps) => {
  const { fixer, scanService, events, getProjectPath, getLastScanResult, loadTemplate } = deps;

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

  const applyAction = async (action: FixPlan['actions'][number], projectPath: string): Promise<void> => {
    const fullPath = resolve(projectPath, action.path);
    await mkdir(dirname(fullPath), { recursive: true });

    if (action.type === 'create') {
      let content = action.content ?? '';
      // Resolve template placeholder
      const templateMatch = content.match(/^\[TEMPLATE:(.+)]$/);
      if (templateMatch) {
        content = await loadTemplate(templateMatch[1]);
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

  const applyFix = async (plan: FixPlan): Promise<FixResult> => {
    const projectPath = getProjectPath();
    const scoreBefore = getLastScanResult()?.score.totalScore ?? 0;
    const backedUp: string[] = [];

    try {
      for (const action of plan.actions) {
        const backup = await backupFile(action.path);
        backedUp.push(backup);
        await applyAction(action, projectPath);
      }

      // Re-scan to get updated score
      const newResult = await scanService.scan(projectPath);
      const scoreAfter = newResult.score.totalScore;

      events.emit('score.updated', { before: scoreBefore, after: scoreAfter });

      return {
        plan,
        applied: true,
        scoreBefore,
        scoreAfter,
        backedUpFiles: backedUp,
      };
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

  const applyAll = async (): Promise<readonly FixResult[]> => {
    const plans = previewAll();
    const results: FixResult[] = [];
    for (const plan of plans) {
      const result = await applyFix(plan);
      results.push(result);
    }
    return results;
  };

  return Object.freeze({ preview, previewAll, applyFix, applyAll });
};

export type FixService = ReturnType<typeof createFixService>;
