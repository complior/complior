/**
 * V1-M30 / W-3: INTEGRATION test — Laws tab against REAL obligations.json data.
 *
 * V1-M27 HR-4 + V1-M29 W-3 wrote unit tests with hand-crafted obligation entries.
 * Production uses 108 obligations from engine/core/data/regulations/eu-ai-act/
 * obligations.json with shape: { obligation_id, article_reference, title,
 * applies_to_role, applies_to_risk_level }.
 *
 * Acceptance:
 *   1. General profile HTML: NO Transport-specific obligations rendered
 *   2. Finance profile HTML: NO Healthcare-specific obligations
 *   3. Healthcare profile HTML: includes medical obligations
 *   4. Disclaimer present in HTML when N obligations excluded (any profile)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m30-w3-${process.pid}`);

async function generateReportForProfile(role: string, riskLevel: string, domain: string): Promise<string> {
  rmSync(TEST_PROJECT, { recursive: true, force: true });
  mkdirSync(TEST_PROJECT, { recursive: true });
  writeFileSync(resolve(TEST_PROJECT, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
  process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;

  const { loadApplication } = await import('../composition-root.js');
  const app = await loadApplication();

  // Set profile via onboarding (production code path)
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

  // Run scan to populate findings
  await app.app.request('/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: TEST_PROJECT }),
  });

  // Generate HTML report
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

describe('V1-M30 W-3: Laws tab against REAL obligations.json', () => {
  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('General domain: Laws tab does NOT show Transport/LawEnforcement obligations', async () => {
    const html = await generateReportForProfile('deployer', 'limited', 'general');
    const lawsTab = extractTab(html, 'laws');
    expect(lawsTab).not.toMatch(/Transport.*Autonomous|Law Enforcement|TRANS-\d|OBL-LE-/i);
  }, 30000);

  it('Finance domain: Laws tab does NOT show Healthcare/MED obligations', async () => {
    const html = await generateReportForProfile('deployer', 'high', 'finance');
    const lawsTab = extractTab(html, 'laws');
    expect(lawsTab).not.toMatch(/Healthcare.*Medical Device|MED-\d|patient/i);
  }, 30000);

  it('Healthcare domain: Laws tab includes medical obligations', async () => {
    const html = await generateReportForProfile('provider', 'high', 'healthcare');
    const lawsTab = extractTab(html, 'laws');
    expect(lawsTab).toMatch(/Healthcare|Medical Device|MED-\d/i);
  }, 30000);

  it('Laws tab disclaimer present when obligations excluded (all 3 profiles)', async () => {
    for (const params of [
      { role: 'deployer', risk: 'limited', domain: 'general' },
      { role: 'provider', risk: 'high', domain: 'healthcare' },
      { role: 'deployer', risk: 'high', domain: 'finance' },
    ]) {
      const html = await generateReportForProfile(params.role, params.risk, params.domain);
      const lawsTab = extractTab(html, 'laws');
      const hasDisclaimer =
        /not\s+applicable\s+for\s+your\s+profile/i.test(lawsTab) ||
        /\+\s*\d+\s+(more|other|additional)\s+obligation/i.test(lawsTab) ||
        /excluded/i.test(lawsTab);
      expect(hasDisclaimer, `Profile ${params.role}/${params.risk}/${params.domain} missing disclaimer`).toBe(true);
    }
  }, 90000);
});
