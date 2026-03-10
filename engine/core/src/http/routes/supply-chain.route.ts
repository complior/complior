import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import { parsePackageJson, parseRequirementsTxt, parseCargoToml, parseGoMod } from '../../domain/scanner/layers/layer3-parsers.js';
import type { ParsedDependency } from '../../domain/scanner/layers/layer3-parsers.js';
import { analyzeSupplyChain } from '../../domain/supply-chain/index.js';
import { createEvidence } from '../../domain/scanner/evidence.js';
import { REGISTRY_CARDS, REGISTRY_SLUG_PATTERN, getProviderName } from '../../data/registry-cards.js';
import type { EvidenceStore } from '../../domain/scanner/evidence-store.js';
import type { AuditStore } from '../../domain/audit/audit-trail.js';

const SupplyChainRequestSchema = z.object({
  path: z.string().min(1),
});

const ModelsQuerySchema = z.object({
  provider: z.string().optional(),
});

export interface SupplyChainRouteDeps {
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
}

const DEP_FILES = [
  { file: 'package.json', parser: parsePackageJson },
  { file: 'requirements.txt', parser: parseRequirementsTxt },
  { file: 'Cargo.toml', parser: parseCargoToml },
  { file: 'go.mod', parser: parseGoMod },
] as const;

const CONFIG_FILES = ['package.json', '.env', '.env.local', 'config.json', 'config.ts', 'config.js'] as const;

const tryReadFile = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
};

const collectDependencies = async (projectPath: string): Promise<ParsedDependency[]> => {
  const deps: ParsedDependency[] = [];
  for (const { file, parser } of DEP_FILES) {
    const content = await tryReadFile(join(projectPath, file));
    if (content) deps.push(...parser(content));
  }
  return deps;
};

const detectModels = async (projectPath: string): Promise<string[]> => {
  const models = new Set<string>();
  for (const file of CONFIG_FILES) {
    const content = await tryReadFile(join(projectPath, file));
    if (content) {
      for (const match of content.matchAll(REGISTRY_SLUG_PATTERN)) {
        models.add(match[0]);
      }
    }
  }
  return [...models];
};

export const createSupplyChainRoute = (deps: SupplyChainRouteDeps) => {
  const app = new Hono();

  app.post('/supply-chain', async (c) => {
    const body = await c.req.json();
    const parsed = SupplyChainRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const projectPath = parsed.data.path;
    const allDeps = await collectDependencies(projectPath);
    const detectedModels = await detectModels(projectPath);
    const report = analyzeSupplyChain(projectPath, allDeps, detectedModels);

    // Persist report
    const reportsDir = join(projectPath, '.complior', 'reports');
    await mkdir(reportsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(reportsDir, `supply-chain-${ts}.json`);
    await writeFile(reportPath, JSON.stringify(report, null, 2));

    // Evidence chain (one entry per risk)
    if (deps.evidenceStore && report.risks.length > 0) {
      const evidenceItems = report.risks.map((risk, i) =>
        createEvidence(`supply-chain-${i}`, 'L3', 'supply-chain', {
          snippet: risk.description,
          file: risk.packageName || undefined,
        }),
      );
      await deps.evidenceStore.append(evidenceItems, `supply-chain-${Date.now()}`);
    }

    // Audit trail
    if (deps.auditStore) {
      await deps.auditStore.append('supply-chain.audited', {
        projectPath,
        totalDependencies: report.totalDependencies,
        riskScore: report.riskScore,
        risksCount: report.risks.length,
        reportPath,
      });
    }

    return c.json(report);
  });

  app.get('/supply-chain/models', async (c) => {
    const parsed = ModelsQuerySchema.safeParse({
      provider: c.req.query('provider'),
    });
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const { provider } = parsed.data;
    const cards = provider
      ? REGISTRY_CARDS.filter((card) => getProviderName(card).toLowerCase() === provider.toLowerCase())
      : REGISTRY_CARDS;

    return c.json({ models: cards, total: cards.length });
  });

  return app;
};
