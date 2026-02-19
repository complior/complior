import { resolve, dirname } from 'node:path';
import { mkdir, copyFile, unlink, readFile, writeFile } from 'node:fs/promises';
import type { EventBusPort } from '../ports/events.port.js';
import type { ScanService } from './scan-service.js';
import type { FixPlan, FixResult, FixValidation, FixHistory, FixHistoryEntry, FixHistoryFile } from '../domain/fixer/types.js';
import type { ScanResult } from '../types/common.types.js';
import { createEmptyHistory, addEntry, markUndone, getLastApplied, getById } from '../domain/fixer/fix-history.js';

export interface UndoServiceDeps {
  readonly events: EventBusPort;
  readonly scanService: ScanService;
  readonly getProjectPath: () => string;
  readonly getHistoryPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
}

export const createUndoService = (deps: UndoServiceDeps) => {
  const { events, scanService, getProjectPath, getHistoryPath, getLastScanResult } = deps;

  const loadHistory = async (): Promise<FixHistory> => {
    try {
      const raw = await readFile(getHistoryPath(), 'utf-8');
      return JSON.parse(raw) as FixHistory;
    } catch {
      return createEmptyHistory();
    }
  };

  const saveHistory = async (history: FixHistory): Promise<void> => {
    const historyPath = getHistoryPath();
    await mkdir(dirname(historyPath), { recursive: true });
    await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');
  };

  const recordFix = async (result: FixResult, plan: FixPlan): Promise<void> => {
    const history = await loadHistory();
    const nextId = history.fixes.length > 0
      ? Math.max(...history.fixes.map((f) => f.id)) + 1
      : 1;

    const files: FixHistoryFile[] = plan.actions.map((action, i) => ({
      path: action.path,
      action: action.type,
      backupPath: result.backedUpFiles[i] ?? '',
    }));

    const entry: FixHistoryEntry = {
      id: nextId,
      checkId: plan.checkId,
      obligationId: plan.obligationId,
      fixType: plan.fixType,
      status: 'applied',
      timestamp: new Date().toISOString(),
      files,
      scoreBefore: result.scoreBefore,
      scoreAfter: result.scoreAfter,
    };

    await saveHistory(addEntry(history, entry));
  };

  const undoEntry = async (entry: FixHistoryEntry): Promise<FixValidation> => {
    const projectPath = getProjectPath();
    const scoreBefore = getLastScanResult()?.score.totalScore ?? 0;
    const restoredFiles: string[] = [];

    for (const file of entry.files) {
      const fullPath = resolve(projectPath, file.path);
      if (file.action === 'create') {
        try { await unlink(fullPath); } catch { /* already removed */ }
      } else {
        await mkdir(dirname(fullPath), { recursive: true });
        await copyFile(file.backupPath, fullPath);
      }
      restoredFiles.push(file.path);
    }

    // Mark as undone in history
    const history = await loadHistory();
    await saveHistory(markUndone(history, entry.id));

    // Re-scan to get updated score
    const newResult = await scanService.scan(projectPath);
    const scoreAfter = newResult.score.totalScore;

    events.emit('fix.undone', { checkId: entry.checkId, restoredFiles });

    const findingAfter = newResult.findings.find((f) => f.checkId === entry.checkId);

    return {
      checkId: entry.checkId,
      obligationId: entry.obligationId,
      article: '',
      before: 'pass',
      after: findingAfter?.type ?? 'fail',
      scoreDelta: scoreAfter - scoreBefore,
      totalScore: scoreAfter,
    };
  };

  const undoLast = async (): Promise<FixValidation> => {
    const history = await loadHistory();
    const entry = getLastApplied(history);
    if (!entry) throw new Error('No applied fixes to undo');
    return undoEntry(entry);
  };

  const undoById = async (id: number): Promise<FixValidation> => {
    const history = await loadHistory();
    const entry = getById(history, id);
    if (!entry) throw new Error(`Fix #${id} not found`);
    if (entry.status === 'undone') throw new Error(`Fix #${id} already undone`);
    return undoEntry(entry);
  };

  const getHistory = async (): Promise<FixHistory> => loadHistory();

  return Object.freeze({ recordFix, undoLast, undoById, getHistory });
};

export type UndoService = ReturnType<typeof createUndoService>;
