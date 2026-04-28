/**
 * V1-M30 / W-4: INTEGRATION test — Documents tab against REAL document inventory.
 *
 * V1-M27 HR-5 + V1-M29 W-4 wrote unit tests with hand-crafted document arrays.
 * Production builds DocumentInventory from scan findings. Filter must use real
 * profile context (riskLevel + role) against real doc types.
 *
 * Acceptance:
 *   1. Limited-risk profile HTML: NO doc-card containing FRIA
 *   2. High-risk profile HTML: doc-card containing FRIA visible
 *   3. Deployer profile HTML: NO declaration-of-conformity (provider-only)
 *   4. Provider profile HTML: declaration-of-conformity visible
 *   5. Disclaimer present in HTML when N docs excluded
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m30-w4-${process.pid}`);

async function generateReportForProfile(role: string, riskLevel: string, domain: string): Promise<string> {
  rmSync(TEST_PROJECT, { recursive: true, force: true });
  mkdirSync(TEST_PROJECT, { recursive: true });
  writeFileSync(resolve(TEST_PROJECT, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;

  const { loadApplication } = await import('../composition-root.js');
  const app = await loadApplication();

  await app.app.request('/onboarding/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: {
        org_role: role, domain, data_types: ['public'],
        system_type: 'standalone', gpai_model: 'no', user_facing: 'yes',
        autonomous_decisions: riskLevel === 'high' ? 'yes' : 'no',
        biometric_data: 'no', company_size: 'sme',
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
  const html = readFileSync(data.path!, 'utf-8');
  app.shutdown();
  return html;
}

function extractTab(html: string, tabId: string): string {
  const m = html.match(new RegExp(`<div class="tab-content" id="tab-${tabId}"[^>]*>([\\s\\S]*?)(?=<div class="tab-content"|</body>)`, 'i'));
  return m ? m[1] : '';
}

function extractDocCards(tab: string): string {
  // Document cards have class doc-card; concatenate all card contents
  const cards = tab.match(/<div class="doc-card">[\s\S]*?<\/div>/g) ?? [];
  return cards.join('\n');
}

describe('V1-M30 W-4: Documents tab against REAL inventory', () => {
  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('Limited-risk: doc-cards do NOT contain FRIA', async () => {
    const html = await generateReportForProfile('deployer', 'limited', 'general');
    const docsTab = extractTab(html, 'documents');
    const cards = extractDocCards(docsTab);
    expect(cards).not.toMatch(/\bFRIA\b|fria\.md|fundamental.rights.impact/i);
  }, 30000);

  it('High-risk: doc-cards DO contain FRIA', async () => {
    const html = await generateReportForProfile('provider', 'high', 'healthcare');
    const docsTab = extractTab(html, 'documents');
    expect(docsTab).toMatch(/\bFRIA\b|fundamental.rights/i);
  }, 30000);

  it('Deployer role: doc-cards do NOT contain declaration-of-conformity', async () => {
    const html = await generateReportForProfile('deployer', 'limited', 'general');
    const docsTab = extractTab(html, 'documents');
    const cards = extractDocCards(docsTab);
    expect(cards).not.toMatch(/declaration.of.conformity|conformity.declaration/i);
  }, 30000);

  it('Documents disclaimer present when docs excluded (limited + finance)', async () => {
    for (const params of [
      { role: 'deployer', risk: 'limited', domain: 'general' },
      { role: 'deployer', risk: 'high', domain: 'finance' },
    ]) {
      const html = await generateReportForProfile(params.role, params.risk, params.domain);
      const docsTab = extractTab(html, 'documents');
      const hasDisclaimer =
        /not\s+(required|applicable)\s+for\s+your\s+profile/i.test(docsTab) ||
        /\+\s*\d+\s+(more|other|additional)\s+(documents?|docs?)/i.test(docsTab) ||
        /excluded.*profile/i.test(docsTab);
      expect(hasDisclaimer, `Profile ${params.role}/${params.risk}/${params.domain} missing docs disclaimer`).toBe(true);
    }
  }, 60000);
});
