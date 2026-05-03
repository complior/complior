/**
 * V1-M29 / W-1: RED test — `complior init` MUST create evidence chain in production code path.
 *
 * Background:
 *   V1-M22 A-8 / V1-M27 HR-1 added unit tests for evidence chain auto-init,
 *   but the production `init` flow does NOT actually call evidenceStore.append()
 *   for the genesis entry. Result: every project after init shows
 *   "Score capped: Evidence chain missing or invalid" in Overview tab.
 *
 *   Verified in /deep-e2e (2026-04-27): all 3 profiles after `complior init --yes`
 *   produce HTML reports with this message.
 *
 * Specification:
 *   - After init flow completes, .complior/evidence/chain.json exists
 *   - Chain has ≥1 genesis entry, signed by ed25519 keypair
 *   - evidenceStore.summary() returns chainValid=true
 *   - Subsequent scan does NOT trigger criticalCap "Evidence chain missing or invalid"
 *
 * Architecture:
 *   - Idempotent (safe to re-run init)
 *   - Genesis signed by ~/.config/complior/keys/
 *   - Persisted to <project>/.complior/evidence/chain.json
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m29-w1-${process.pid}`);

describe('V1-M29 W-1: complior init creates evidence chain in production', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
  });

  it('after init completes, .complior/evidence/chain.json exists', async () => {
    const { runInitForProject } = await import('./init-service.js');
    await runInitForProject({ projectPath: TEST_PROJECT });

    const chainPath = resolve(TEST_PROJECT, '.complior/evidence/chain.json');
    expect(existsSync(chainPath)).toBe(true);
  });

  it('chain has at least 1 entry (genesis) after init', async () => {
    const { runInitForProject } = await import('./init-service.js');
    await runInitForProject({ projectPath: TEST_PROJECT });

    const { createEvidenceStoreForProject } = await import(
      '../domain/scanner/evidence-store.js'
    );
    const store = await (createEvidenceStoreForProject as unknown as (
      p: string,
    ) => Promise<{ summary?: () => Promise<{ totalEntries: number }> }>)(TEST_PROJECT);
    const summary = await store.summary?.();
    expect(summary?.totalEntries ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('post-init scan does NOT include "Evidence chain missing or invalid" criticalCap', async () => {
    const { runInitForProject } = await import('./init-service.js');
    await runInitForProject({ projectPath: TEST_PROJECT });

    const { createScanServiceForProject } = await import('./scan-service.js');
    const scanService = (createScanServiceForProject as unknown as (
      p: string,
    ) => { scan: (p: string) => Promise<unknown> })(TEST_PROJECT);
    const result = (await scanService.scan(TEST_PROJECT)) as {
      readiness?: { criticalCaps?: readonly string[] };
    };

    const caps = result.readiness?.criticalCaps ?? [];
    const evidenceCap = caps.find((c) => /evidence\s+chain.*(missing|invalid)/i.test(c));
    expect(evidenceCap).toBeUndefined();
  });

  it('init is idempotent (re-run does not duplicate genesis)', async () => {
    const { runInitForProject } = await import('./init-service.js');
    const { createEvidenceStoreForProject } = await import(
      '../domain/scanner/evidence-store.js'
    );

    await runInitForProject({ projectPath: TEST_PROJECT });
    const store = await (createEvidenceStoreForProject as unknown as (
      p: string,
    ) => Promise<{ summary?: () => Promise<{ totalEntries: number }> }>)(TEST_PROJECT);
    const first = (await store.summary?.())?.totalEntries ?? 0;

    await runInitForProject({ projectPath: TEST_PROJECT });
    const second = (await store.summary?.())?.totalEntries ?? 0;

    expect(second).toBe(first);
  });
});
