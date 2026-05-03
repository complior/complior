/**
 * V1-M22 / A-3 (H-3): RED test — HTML Overview page must show company profile block.
 *
 * User requirement from V1-M21 review:
 *   "Профиль компании, который сформирован ответами на вопросы, надо выдать на
 *    главной странице, с статьями и подстатьями закона EU AI Act под какие
 *    компания подпадает (очень коротко и компактно)"
 *
 * Specification:
 *   - `<section id="company-profile">` or similar semantic anchor on Overview
 *   - Contains: role (provider/deployer/both), risk level, domain
 *   - Contains: compact list of applicable EU AI Act articles (e.g. "Art. 6, 9, 11, 14, 27, 50, 72")
 *   - At least one article reference rendered
 *
 * Architecture:
 *   - Data from project.toml / onboarding (not hardcoded)
 *   - Typed `CompanyProfile` interface
 *   - Pure rendering fn
 */

import { describe, it, expect } from 'vitest';

describe('V1-M22 / A-3: HTML Overview company profile block', () => {
  it('Overview contains company-profile section', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportDataWithProfile());

    // Semantic anchor: section/id OR heading with "Company Profile" / "Project Profile"
    const hasSection =
      /id="company-profile"|id="project-profile"/.test(html) ||
      /<h[1-3][^>]*>(Company|Project)\s+Profile<\/h[1-3]>/i.test(html);

    expect(hasSection).toBe(true);
  });

  it('Overview renders role from profile', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportDataWithProfile());

    expect(html.toLowerCase()).toMatch(/provider|deployer|both/);
  });

  it('Overview renders risk level from profile', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportDataWithProfile());

    expect(html.toLowerCase()).toMatch(/high|limited|minimal|unacceptable/);
  });

  it('Overview renders industry domain from profile', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportDataWithProfile());

    expect(html.toLowerCase()).toContain('healthcare');
  });

  it('Overview shows at least one applicable EU AI Act article', async () => {
    const { buildHtmlReport } = await import('./html-report.js');
    const html = buildHtmlReport(mockReportDataWithProfile());

    // Compact article list: "Art. 6", "Art. 9", etc.
    expect(html).toMatch(/Art\.\s*\d+/);
  });
});

function mockReportDataWithProfile(): unknown {
  return Object.freeze({
    projectPath: '/tmp/test-project',
    scannedAt: '2026-04-24T12:00:00Z',
    score: { totalScore: 72, zone: 'yellow' },
    findings: [],
    profile: {
      role: 'provider' as const,
      riskLevel: 'high' as const,
      domain: 'healthcare',
      applicableArticles: ['Art. 6', 'Art. 9', 'Art. 11', 'Art. 14', 'Art. 27'],
    },
    filterContext: {
      role: 'provider' as const,
      riskLevel: 'high',
      domain: 'healthcare',
      profileFound: true,
      totalTests: 100,
      applicableTests: 80,
      skippedByRole: 10,
      skippedByRiskLevel: 5,
      skippedByDomain: 5,
    },
    obligations: [],
    disclaimer: { summary: 'test', limitations: [] },
  });
}
