/**
 * V1-M27 / HR-1: RED test — `complior init` must auto-create evidence chain seed.
 *
 * Background:
 *   Overview tab показывает "Score capped: Evidence chain missing or invalid".
 *   V1-M22 A-8 spec'ил это, но runtime не работает. User видит mystic message.
 *
 * Specification:
 *   - After `complior init` completes successfully, evidence chain is valid
 *   - Re-running init is idempotent (doesn't break existing chain)
 *   - Chain has at least 1 genesis entry
 *   - Verification passes (`evidenceStore.verify()` → valid)
 *
 * Architecture:
 *   - Idempotent: skip if chain already valid
 *   - Genesis entry signed by ed25519 keypair (~/.config/complior/keys/)
 *   - Persisted to .complior/evidence/chain.json
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m27-hr1-${process.pid}`);

describe('V1-M27 HR-1: complior init auto-creates evidence chain', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
    writeFileSync(resolve(TEST_PROJECT, 'README.md'), '# test\n', 'utf-8');
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
  });

  it('initService.initialize creates evidence chain file', async () => {
    const { runInit } = await loadInitService();
    await runInit({ projectPath: TEST_PROJECT, autoYes: true });

    const chainPath = resolve(TEST_PROJECT, '.complior/evidence/chain.json');
    expect(existsSync(chainPath)).toBe(true);
  });

  it('evidence chain after init has at least 1 entry (genesis)', async () => {
    const { runInit, evidenceStore } = await loadInitService();
    await runInit({ projectPath: TEST_PROJECT, autoYes: true });

    const summary = await evidenceStore.summary?.();
    expect(summary?.totalEntries ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('evidence chain after init is valid (verify passes)', async () => {
    const { runInit, evidenceStore } = await loadInitService();
    await runInit({ projectPath: TEST_PROJECT, autoYes: true });

    const verification = await evidenceStore.verify?.();
    expect(verification?.valid ?? false).toBe(true);
  });

  it('re-running init is idempotent (chain not duplicated)', async () => {
    const { runInit, evidenceStore } = await loadInitService();
    await runInit({ projectPath: TEST_PROJECT, autoYes: true });
    const firstCount = (await evidenceStore.summary?.())?.totalEntries ?? 0;

    await runInit({ projectPath: TEST_PROJECT, autoYes: true });
    const secondCount = (await evidenceStore.summary?.())?.totalEntries ?? 0;

    expect(secondCount).toBe(firstCount);
  });

  it('scan after init does NOT show "Score capped: Evidence chain missing"', async () => {
    const { runInit, scanService } = await loadInitService();
    await runInit({ projectPath: TEST_PROJECT, autoYes: true });

    const result = await scanService.scan(TEST_PROJECT);
    const criticalCaps = (result as { score?: { criticalCapApplied?: boolean }; readiness?: { criticalCaps?: readonly string[] } });
    const caps = criticalCaps.readiness?.criticalCaps ?? [];
    const evidenceCap = caps.find((c) => /evidence\s+chain.*missing|invalid/i.test(c));
    expect(evidenceCap).toBeUndefined();
  });
});

// ── Helpers ────────────────────────────────────────────────────────

async function loadInitService() {
  // Exposed entry — V1-M27 may add `runInit()` factory; until then test will
  // fail to compile (RED).
  const initModule = await import('./init-service.js');
  const evidenceModule = await import('../domain/scanner/evidence-store.js');
  const scanModule = await import('./scan-service.js');

  // Need a way to obtain wired evidenceStore + scanService for TEST_PROJECT.
  // Composition-root style — V1-M27 dev wires this through.
  type EvidenceStoreResult = { summary?: () => Promise<{ totalEntries: number }>; verify?: () => Promise<{ valid: boolean }> };
  type EvidenceStoreFactory = (path: string) => Promise<EvidenceStoreResult>;
  const evidenceStore = await ((evidenceModule as unknown as { createEvidenceStoreForProject: EvidenceStoreFactory }).createEvidenceStoreForProject(TEST_PROJECT));

  return {
    runInit: (initModule as unknown as { runInit: (opts: { projectPath: string; autoYes: boolean }) => Promise<unknown> }).runInit,
    evidenceStore,
    scanService: (scanModule as unknown as { createScanServiceForProject: (path: string) => { scan: (path: string) => Promise<unknown> } }).createScanServiceForProject(TEST_PROJECT),
  };
}
