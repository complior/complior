import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createUndoService } from './undo-service.js';
import type { FixPlan, FixResult } from '../domain/fixer/types.js';
import { createMockScanResult, createMockFinding } from '../test-helpers/factories.js';

const PROJECT_PATH = '/tmp/test-undo';
const HISTORY_PATH = resolve(PROJECT_PATH, '.complior', 'history.json');

// In-memory fs simulation
let files: Map<string, string>;

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async (path: string) => {
    const content = files.get(path);
    if (content === undefined) throw new Error(`ENOENT: ${path}`);
    return content;
  }),
  writeFile: vi.fn(async (path: string, content: string) => {
    files.set(path, content);
  }),
  mkdir: vi.fn(async () => {}),
  copyFile: vi.fn(async (src: string, dest: string) => {
    const content = files.get(src);
    if (content === undefined) throw new Error(`ENOENT: ${src}`);
    files.set(dest, content);
  }),
  unlink: vi.fn(async (path: string) => {
    files.delete(path);
  }),
}));

const createMockPlan = (overrides?: Partial<FixPlan>): FixPlan => ({
  obligationId: 'OBL-015',
  checkId: 'ai-disclosure',
  article: 'Art. 52',
  fixType: 'template_generation',
  framework: 'Next.js',
  actions: [{ type: 'create', path: 'ai-disclosure.md', content: '# AI', description: 'Create' }],
  diff: '+# AI',
  scoreImpact: 5,
  commitMessage: 'feat: add AI disclosure',
  description: 'Add disclosure',
  ...overrides,
});

const createMockResult = (overrides?: Partial<FixResult>): FixResult => ({
  plan: createMockPlan(),
  applied: true,
  scoreBefore: 60,
  scoreAfter: 70,
  backedUpFiles: ['/tmp/test-undo/.complior/backups/123-ai-disclosure.md'],
  ...overrides,
});

describe('undo-service', () => {
  let currentScore: number;

  beforeEach(() => {
    files = new Map();
    currentScore = 70;
  });

  const createTestService = () => {
    const events = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
    const scanService = {
      scan: vi.fn().mockImplementation(async () =>
        createMockScanResult({
          score: {
            totalScore: currentScore,
            zone: currentScore >= 80 ? 'green' : 'yellow',
            categoryScores: [],
            criticalCapApplied: false,
            totalChecks: 10,
            passedChecks: 7,
            failedChecks: 2,
            skippedChecks: 1,
          },
          findings: [
            createMockFinding({ checkId: 'ai-disclosure', type: currentScore <= 60 ? 'fail' : 'pass' }),
          ],
        }),
      ),
    };

    const service = createUndoService({
      events,
      scanService,
      getProjectPath: () => PROJECT_PATH,
      getHistoryPath: () => HISTORY_PATH,
      getLastScanResult: () => createMockScanResult({
        score: {
          totalScore: currentScore,
          zone: currentScore >= 80 ? 'green' : 'yellow',
          categoryScores: [],
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 7,
          failedChecks: 2,
          skippedChecks: 1,
        },
      }),
    });

    return { service, events, scanService };
  };

  it('records fix then undoes it, restoring file', async () => {
    const { service, events, scanService } = createTestService();
    const plan = createMockPlan();
    const result = createMockResult();

    // Set up backup file
    files.set(result.backedUpFiles[0]!, 'original content');

    await service.recordFix(result, plan);

    // After fix, current score is 70. Undo will re-scan and get 60.
    scanService.scan.mockImplementationOnce(async () => {
      currentScore = 60;
      return createMockScanResult({
        score: {
          totalScore: 60,
          zone: 'yellow',
          categoryScores: [],
          criticalCapApplied: false,
          totalChecks: 10,
          passedChecks: 6,
          failedChecks: 3,
          skippedChecks: 1,
        },
        findings: [createMockFinding({ checkId: 'ai-disclosure', type: 'fail' })],
      });
    });
    const validation = await service.undoLast();

    expect(validation.checkId).toBe('ai-disclosure');
    expect(validation.scoreDelta).toBe(-10); // 60 - 70
    expect(events.emit).toHaveBeenCalledWith('fix.undone', {
      checkId: 'ai-disclosure',
      restoredFiles: ['ai-disclosure.md'],
    });
  });

  it('undoes by specific ID when multiple fixes exist', async () => {
    const { service } = createTestService();

    // Record 3 fixes
    await service.recordFix(
      createMockResult({ scoreBefore: 50, scoreAfter: 55 }),
      createMockPlan({ checkId: 'check-1', obligationId: 'OBL-001' }),
    );
    await service.recordFix(
      createMockResult({ scoreBefore: 55, scoreAfter: 60, backedUpFiles: ['/tmp/test-undo/.complior/backups/456-file2.md'] }),
      createMockPlan({ checkId: 'check-2', obligationId: 'OBL-002', actions: [{ type: 'edit', path: 'file2.md', oldContent: 'old', newContent: 'new', description: 'Edit' }] }),
    );
    await service.recordFix(
      createMockResult({ scoreBefore: 60, scoreAfter: 65 }),
      createMockPlan({ checkId: 'check-3', obligationId: 'OBL-003' }),
    );

    // Set up backup for fix #2
    files.set('/tmp/test-undo/.complior/backups/456-file2.md', 'backup of file2');

    currentScore = 58;
    const validation = await service.undoById(2);

    expect(validation.checkId).toBe('check-2');
    // Should have restored file2.md from backup
    expect(files.get(resolve(PROJECT_PATH, 'file2.md'))).toBe('backup of file2');
  });

  it('persists history with correct statuses after apply and undo', async () => {
    const { service } = createTestService();

    await service.recordFix(createMockResult(), createMockPlan());

    let history = await service.getHistory();
    expect(history.fixes).toHaveLength(1);
    expect(history.fixes[0]!.status).toBe('applied');

    currentScore = 60;
    // Need backup file for create undo (delete)
    await service.undoLast();

    history = await service.getHistory();
    expect(history.fixes).toHaveLength(1);
    expect(history.fixes[0]!.status).toBe('undone');
  });
});
