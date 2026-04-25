/**
 * V1-M26: RED test — obligationsToArticles must map obligation IDs to EU AI Act
 * article references, deduplicated, sorted, with optional domain filter.
 *
 * Background:
 *   composition-root.ts:564 returns raw obligation IDs as `applicableArticles`.
 *   User original requirement (V1-M21 review):
 *     "Профиль компании выдать с СТАТЬЯМИ И ПОДСТАТЬЯМИ закона EU AI Act"
 *   Currently shows OBL-001 etc., should show Art. 4 etc.
 *
 * Specification:
 *   - obligationsToArticles(['eu-ai-act-OBL-001']) → ['Article 4']
 *   - Multiple OBLs same article: deduplicated
 *   - Sorted ascending by article number
 *   - Unknown OBL IDs silently filtered (forward-compat)
 *   - Domain filter: excludeOtherIndustries skips FIN/MED/EDU/etc. for general
 *   - Returns frozen array
 *
 * Architecture:
 *   - Pure function (deterministic)
 *   - Object.freeze on result
 *   - Data from obligations.json (regulations data)
 */

import { describe, it, expect } from 'vitest';

describe('V1-M26: obligationsToArticles maps OBL-IDs → EU AI Act articles', () => {
  it('maps single OBL-ID to article number', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    const result = obligationsToArticles(['eu-ai-act-OBL-001']);
    expect(result).toContain('Article 4');
  });

  it('deduplicates multiple OBLs with same article reference', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    const result = obligationsToArticles(['eu-ai-act-OBL-001', 'eu-ai-act-OBL-001A']);
    // Both OBL-001 and OBL-001A reference Article 4 → should appear ONCE
    expect(result.filter((a) => a === 'Article 4').length).toBe(1);
  });

  it('result is sorted ascending by article number', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    // OBL-001 → Article 4, OBL-002 → Article 5, OBL-015 → Article 50(1)
    const result = obligationsToArticles([
      'eu-ai-act-OBL-015', // Article 50(1)
      'eu-ai-act-OBL-001', // Article 4
      'eu-ai-act-OBL-002', // Article 5
    ]);
    // Find positions
    const idxArt4 = result.findIndex((a) => a === 'Article 4');
    const idxArt5 = result.findIndex((a) => a === 'Article 5');
    const idxArt50 = result.findIndex((a) => a === 'Article 50(1)');
    expect(idxArt4).toBeLessThan(idxArt5);
    expect(idxArt5).toBeLessThan(idxArt50);
  });

  it('silently filters unknown OBL IDs (forward-compat)', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    const result = obligationsToArticles([
      'eu-ai-act-OBL-001',
      'eu-ai-act-OBL-NONEXISTENT-999',
    ]);
    expect(result).toContain('Article 4');
    expect(result).not.toContain('eu-ai-act-OBL-NONEXISTENT-999');
  });

  it('domain filter excludes other-industry obligations for general', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    const result = obligationsToArticles(
      [
        'eu-ai-act-OBL-001', // general
        'eu-ai-act-OBL-FIN-001', // finance only
        'eu-ai-act-OBL-MED-002', // medical only
      ],
      { domain: 'general', excludeOtherIndustries: true },
    );
    expect(result).toContain('Article 4');
    // FIN/MED article references should NOT be in result
    const allRefs = result.join(' ');
    expect(allRefs).not.toMatch(/\bAnnex III point 5/);
  });

  it('returns frozen array', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    const result = obligationsToArticles(['eu-ai-act-OBL-001']);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('is deterministic (same input → same output)', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    const a = obligationsToArticles(['eu-ai-act-OBL-001', 'eu-ai-act-OBL-005']);
    const b = obligationsToArticles(['eu-ai-act-OBL-005', 'eu-ai-act-OBL-001']);
    expect(a).toStrictEqual(b);
  });

  it('empty input returns empty frozen array', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    const result = obligationsToArticles([]);
    expect(result).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe('V1-M26: composition-root surfaces article references (not OBL-IDs) to profile', () => {
  it('CompanyProfile.applicableArticles contains "Article N" entries, not "eu-ai-act-OBL-*"', async () => {
    const { obligationsToArticles } = await import('./applicable-articles.js');
    const sampleProfile = {
      role: 'deployer' as const,
      riskLevel: 'limited',
      domain: 'general',
      applicableObligations: [
        'eu-ai-act-OBL-001',
        'eu-ai-act-OBL-005',
        'eu-ai-act-OBL-050',
      ],
    };

    // Simulate the composition-root transform
    const result = obligationsToArticles(sampleProfile.applicableObligations, {
      domain: sampleProfile.domain,
      excludeOtherIndustries: true,
    });

    // Must NOT contain raw OBL IDs
    for (const item of result) {
      expect(item).not.toMatch(/^eu-ai-act-OBL-/);
    }

    // Must contain at least one "Article N" or similar EU AI Act reference
    expect(result.some((a) => /^Article\s+\d+/.test(a) || /^Annex/.test(a))).toBe(true);
  });
});
