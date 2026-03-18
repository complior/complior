/**
 * Import route — handles external tool result imports.
 * Currently supports: Promptfoo red-team JSON.
 */

import { Hono } from 'hono';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { importFromPromptfoo } from '../../domain/import/promptfoo-importer.js';
import { createEvidence } from '../../domain/scanner/evidence.js';
import type { EvidenceStore } from '../../domain/scanner/evidence-store.js';

export interface ImportRouteDeps {
  readonly evidenceStore?: EvidenceStore;
  readonly getProjectPath: () => string;
}

export const createImportRoute = (deps: ImportRouteDeps) => {
  const app = new Hono();

  /**
   * POST /import/promptfoo
   * Body: Promptfoo JSON output (redteam results)
   * Returns: PromptfooImportResult with security score
   */
  app.post('/import/promptfoo', async (c) => {
    const body = await c.req.json();

    let result;
    try {
      result = importFromPromptfoo(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.startsWith('VALIDATION_ERROR:')) {
        return c.json({ error: 'VALIDATION_ERROR', message }, 400);
      }
      return c.json({ error: 'IMPORT_ERROR', message }, 500);
    }

    // Save import result
    const projectPath = deps.getProjectPath();
    const importsDir = resolve(projectPath, '.complior', 'imports');
    await mkdir(importsDir, { recursive: true });
    const filename = `promptfoo-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await writeFile(resolve(importsDir, filename), JSON.stringify(result, null, 2));

    // Record evidence
    if (deps.evidenceStore) {
      const evidence = [
        createEvidence(
          `promptfoo-import-${result.timestamp}`,
          'security',
          'security-import',
          { snippet: `Imported ${result.probesRun} probes: score=${result.securityScore.score} grade=${result.securityScore.grade}` },
        ),
      ];
      deps.evidenceStore.append(evidence, `import-${result.timestamp}`).catch(() => {});
    }

    return c.json(result);
  });

  return app;
};
