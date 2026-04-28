/**
 * V1-M30.1 / W-1.1: RED — evidence-chain genesis MUST survive MAX_ENTRIES trim.
 *
 * Bug:
 *   evidence-store.ts trims with `entries.slice(entries.length - MAX_ENTRIES)`
 *   which DROPS the genesis entry once eval pushes the chain past MAX_ENTRIES (=1000).
 *   `verify()` then sees entries[0].chainPrev != null → "broken chain link" → invalid.
 *   Scan adds criticalCap "Evidence chain missing or invalid" → HTML report shows
 *   "Score capped: Evidence chain missing or invalid" in the Overview tab.
 *
 * Acceptance:
 *   T1 — Direct: append 1500 evidence entries → verify() valid; chain.entries[0]
 *        is the genesis (findingId === 'genesis', chainPrev === null).
 *   T2 — Full pipeline: init → scan → eval (det) → report HTML must NOT contain
 *        "Score capped: Evidence chain".
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m30-1-${process.pid}`);

describe('V1-M30.1 W-1.1: evidence chain genesis survives MAX_ENTRIES trim', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
    writeFileSync(resolve(TEST_PROJECT, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('T1: append 1500 entries → genesis still present and verify() valid', async () => {
    // Initialize chain with genesis via runInit
    const { runInit } = await import('../services/init-service.js');
    const initResult = await runInit({ projectPath: TEST_PROJECT });
    expect(initResult.success).toBe(true);

    // Confirm genesis is present pre-trim
    const chainPath = resolve(TEST_PROJECT, '.complior/evidence/chain.json');
    expect(existsSync(chainPath)).toBe(true);
    const chainPre = JSON.parse(readFileSync(chainPath, 'utf-8'));
    expect(chainPre.entries.length).toBe(1);
    expect(chainPre.entries[0].evidence.findingId).toBe('genesis');
    expect(chainPre.entries[0].chainPrev).toBeNull();

    // Open evidence store with the SAME signing key that createEvidenceStoreForProject uses
    // (HMAC-SHA256 keyed by `complior-evidence-${projectPath}`) — so verify() can validate
    // signatures of entries appended through this test path.
    const { createEvidenceStore } = await import('../domain/scanner/evidence-store.js');
    const { createHmac } = await import('node:crypto');
    const key = `complior-evidence-${TEST_PROJECT}`;
    const signHash = (h: string) => createHmac('sha256', key).update(h).digest('hex');
    const verifyHash = (h: string, sig: string) => signHash(h) === sig;
    const store = createEvidenceStore(chainPath, signHash, verifyHash);

    const evidenceBatch = Array.from({ length: 1500 }, (_, i) => ({
      findingId: `synthetic-${i}`,
      layer: 'eval' as const,
      timestamp: new Date().toISOString(),
      source: 'unit-test',
      snippet: `entry ${i}`,
    }));
    await store.append(evidenceBatch, 'test-trim-scan');

    // Reload chain from disk
    const chainPost = JSON.parse(readFileSync(chainPath, 'utf-8'));

    // ── Acceptance assertions ──
    // 1. Chain trimmed (cannot exceed MAX_ENTRIES)
    expect(chainPost.entries.length).toBeLessThanOrEqual(1000);

    // 2. Genesis MUST still be at index 0 (V1-M30.1 fix preserves it across trim)
    expect(chainPost.entries[0].evidence.findingId).toBe('genesis');
    expect(chainPost.entries[0].chainPrev).toBeNull();

    // 3. verify() must report valid (chain integrity preserved)
    const verification = await store.verify();
    expect(
      verification.valid,
      `verify() reported invalid; issues: ${JSON.stringify(verification.issues)}`,
    ).toBe(true);
  }, 60000);

  it('T2: post-trim chain → scan/report HTML has NO "Score capped: Evidence chain"', async () => {
    // ─── Phase 1: bootstrap genesis chain via runInit ───
    const { runInit } = await import('../services/init-service.js');
    await runInit({ projectPath: TEST_PROJECT });

    // ─── Phase 2: append 1500 entries to disk (simulates eval workload that triggers trim) ───
    const chainPath = resolve(TEST_PROJECT, '.complior/evidence/chain.json');
    const { createEvidenceStore } = await import('../domain/scanner/evidence-store.js');
    const { createHmac } = await import('node:crypto');
    const key = `complior-evidence-${TEST_PROJECT}`;
    const signHash = (h: string) => createHmac('sha256', key).update(h).digest('hex');
    const verifyHash = (h: string, sig: string) => signHash(h) === sig;
    const trimStore = createEvidenceStore(chainPath, signHash, verifyHash);
    const batch = Array.from({ length: 1500 }, (_, i) => ({
      findingId: `synthetic-${i}`,
      layer: 'eval' as const,
      timestamp: new Date().toISOString(),
      source: 'unit-test',
      snippet: `entry ${i}`,
    }));
    await trimStore.append(batch, 'test-trim-scan');

    // ─── Phase 3: NOW boot composition-root (its evidenceStore loads the post-trim chain) ───
    // Loading AFTER the disk write means composition-root has no stale cache — its first
    // getSummary() reads trimmed chain. With the bug: verify() reports broken link →
    // chainValid=false → evidenceScore=0 → cap fires → HTML contains "Score capped".
    const { loadApplication } = await import('../composition-root.js');
    const app = await loadApplication();

    try {
      // Run a scan + report through real production routes
      await app.app.request('/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: {
            org_role: 'deployer',
            domain: 'general',
            data_types: ['public'],
            system_type: 'standalone',
            gpai_model: 'no',
            user_facing: 'yes',
            autonomous_decisions: 'no',
            biometric_data: 'no',
            company_size: 'sme',
          },
        }),
      });

      await app.app.request('/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: TEST_PROJECT }),
      });

      const reportRes = await app.app.request('/report/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await reportRes.json()) as { path?: string };
      expect(data.path).toBeTruthy();
      const html = readFileSync(data.path!, 'utf-8');

      // ── Acceptance ── after V1-M30.1, trimmed chain remains valid → cap does NOT fire.
      // Strip HTML tags from cap-warning blocks before assertion so wrapper markup
      // (e.g. <strong>Score capped:</strong>) doesn't hide the content.
      const capBlocks = (html.match(/<div class="cap-warning">[\s\S]*?<\/div>/g) ?? []).map((b) =>
        b.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      );
      expect(
        capBlocks.some((b) => /score\s+capped\s*:?\s*evidence\s+chain\s+(missing|invalid)/i.test(b)),
        `Cap warnings present: ${JSON.stringify(capBlocks)}`,
      ).toBe(false);
    } finally {
      app.shutdown();
    }
  }, 90000);
});
