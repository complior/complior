import { Hono } from 'hono';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { ScanResult, Role } from '../../types/common.types.js';
import { CHECK_TO_OBLIGATIONS, buildOblToChecks } from '../../data/check-to-obligations.js';

export interface ObligationsRouteDeps {
  readonly obligations: readonly Record<string, unknown>[];
  readonly getLastScan: () => ScanResult | null;
}

/** Check if an obligation applies to the given project role. */
const roleApplies = (oblRole: string, projectRole: Role): boolean => {
  if (projectRole === 'both') return true;
  return oblRole === 'both' || oblRole === projectRole;
};

/** Check if an obligation applies to the given risk class.
 *  Fallback: if no risk_class is configured, all risk levels apply. */
const riskLevelApplies = (oblRiskLevels: readonly unknown[], projectRiskClass: string | null): boolean => {
  if (!projectRiskClass) return true;
  return (oblRiskLevels as string[]).length === 0
    || (oblRiskLevels as string[]).includes(projectRiskClass);
};

/** Load project role and risk class from .complior/profile.json if available. */
const loadProjectProfile = async (projectPath: string): Promise<{ role: Role; riskClass: string | null }> => {
  try {
    const profilePath = resolve(projectPath, '.complior', 'profile.json');
    const raw = await readFile(profilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const role = parsed?.answers?.org_role ?? parsed?.role;
    const validRole: Role =
      role === 'provider' || role === 'deployer' || role === 'both'
        ? role as Role
        : 'both';
    const riskClass = parsed?.answers?.risk_class ?? parsed?.risk_class ?? null;
    return { role: validRole, riskClass: typeof riskClass === 'string' ? riskClass : null };
  } catch {
    return { role: 'both', riskClass: null };
  }
};

export const createObligationsRoute = (deps: ObligationsRouteDeps) => {
  const app = new Hono();

  const checkToObls = CHECK_TO_OBLIGATIONS;
  const oblToChecks = buildOblToChecks();

  app.get('/obligations', async (c) => {
    const pathParam = c.req.query('path');
    const scan = deps.getLastScan();

    // Load project role + risk class for filtering
    const { role: projectRole, riskClass } = pathParam
      ? await loadProjectProfile(pathParam)
      : { role: 'both' as Role, riskClass: null };

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

    const oblRiskLevels = (obl: Record<string, unknown>): readonly unknown[] =>
      obl['applies_to_risk_level'] as readonly unknown[] ?? [];

    const result = deps.obligations
      .filter((obl) =>
        roleApplies(String(obl['applies_to_role'] ?? 'both'), projectRole)
        && riskLevelApplies(oblRiskLevels(obl), riskClass),
      )
      .map((obl) => {
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
