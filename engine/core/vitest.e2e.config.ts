/**
 * Vitest config for E2E tests only.
 * Runs: npx vitest run --config vitest.e2e.config.ts
 * Or: npm run test:e2e
 *
 * E2E tests MUST run sequentially (--no-file-parallelism) because they share
 * the same .complior/ disk state (COMPLIOR_TEST_PROJECT).
 *
 * --no-file-parallelism is passed as CLI flag (fileParallelism: false in config
 * is BROKEN in vitest 3.2.4 — it does not disable parallel execution).
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const wsRoot = resolve(__dirname, '..', '..');

// Load .env from workspace root so COMPLIOR_TEST_PROJECT is available
const loadEnv = (): Record<string, string> => {
  const envPath = resolve(wsRoot, '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
    return env;
  } catch { return {}; }
};

const envVars = loadEnv();
if (envVars['COMPLIOR_TEST_PROJECT']) {
  process.env['COMPLIOR_TEST_PROJECT'] = envVars['COMPLIOR_TEST_PROJECT'];
}

const TEST_PROJECT_FALLBACK = resolve(wsRoot, 'test-projects', 'eval-target');

// Reset .complior dir before E2E tests to ensure clean state
const testProject = process.env['COMPLIOR_TEST_PROJECT'] ?? TEST_PROJECT_FALLBACK;
if (testProject) {
  const compliorDir = resolve(testProject, '.complior');
  try {
    if (existsSync(compliorDir)) {
      rmSync(compliorDir, { recursive: true, force: true });
    }
  } catch { /* non-fatal */ }
  try {
    mkdirSync(resolve(compliorDir, 'evidence'), { recursive: true });
    mkdirSync(resolve(compliorDir, 'agents'), { recursive: true });
    const chainPath = resolve(compliorDir, 'evidence', 'chain.json');
    writeFileSync(chainPath, JSON.stringify({
      version: '1.0.0',
      projectPath: testProject,
      entries: [],
      lastHash: '',
    }, null, 2));
  } catch { /* non-fatal */ }
}

export default defineConfig({
  test: {
    // E2E tests only
    include: ['src/e2e/**/*.test.ts'],
    globals: false,
    testTimeout: 30_000,
    // isolate: false is NOT set — each E2E file runs in its own worker (isolated memory).
    // --no-file-parallelism from CLI flag ensures sequential execution on disk.
  },
});
