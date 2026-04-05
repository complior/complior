import { Hono } from 'hono';
import type { ScanResult } from '../../types/common.types.js';
import { CHECK_TO_OBLIGATIONS, buildOblToChecks } from '../../data/check-to-obligations.js';

export interface ObligationsRouteDeps {
  readonly obligations: readonly Record<string, unknown>[];
  readonly getLastScan: () => ScanResult | null;
}

export const createObligationsRoute = (deps: ObligationsRouteDeps) => {
  const app = new Hono();

  const checkToObls = CHECK_TO_OBLIGATIONS;
  const oblToChecks = buildOblToChecks();

  app.get('/obligations', (c) => {
    const scan = deps.getLastScan();

    // Build a set of covered obligation IDs from scan findings
    const coveredIds = new Set<string>();
    if (scan) {
      for (const finding of scan.findings) {
        if (finding.type === 'pass') {
          const oblIds = checkToObls[finding.checkId];
          if (oblIds) {
            for (const id of oblIds) coveredIds.add(id);
          }
        }
      }
    }

    const result = deps.obligations.map((obl) => {
      const oblId = (obl['obligation_id'] as string) ?? '';
      const shortId = oblId.replace(/^eu-ai-act-/, '').toUpperCase();
      const covered = coveredIds.has(shortId);
      const linkedChecks = oblToChecks.get(shortId) ?? [];

      return {
        id: shortId,
        article: obl['article_reference'] ?? '',
        title: obl['title'] ?? '',
        description: obl['description'] ?? '',
        role: obl['applies_to_role'] ?? 'both',
        risk_levels: obl['applies_to_risk_level'] ?? [],
        severity: obl['severity'] ?? 'medium',
        deadline: obl['deadline'] ?? null,
        obligation_type: obl['obligation_type'] ?? '',
        covered,
        linked_checks: linkedChecks,
      };
    });

    return c.json(result);
  });

  return app;
};
