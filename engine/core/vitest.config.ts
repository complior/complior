import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

// __dirname equivalent for ESM: resolve workspace root from this config file
// vitest.config.ts is at: /home/openclaw/complior/engine/core/vitest.config.ts
// wsRoot is: /home/openclaw/complior/
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

// Fallback to COMPLIOR_TEST_PROJECT from shell env (set via `COMPLIOR_TEST_PROJECT=... npx vitest`)
// OR resolve from a known test project path so cleanup always runs during E2E runs
const TEST_PROJECT_FALLBACK = resolve(wsRoot, 'test-projects', 'eval-target');

// Reset evidence chain before E2E tests to avoid stale key conflicts
// Uses SYNC operations so the chain is cleared BEFORE vitest starts running tests
const testProject = process.env['COMPLIOR_TEST_PROJECT'] ?? TEST_PROJECT_FALLBACK;
if (testProject) {
  const compliorDir = resolve(testProject, '.complior');
  // Reset entire .complior dir for full test isolation
  try {
    if (existsSync(compliorDir)) {
      rmSync(compliorDir, { recursive: true, force: true });
    }
  } catch { /* non-fatal */ }
  try {
    // Recreate essential dirs
    mkdirSync(resolve(compliorDir, 'evidence'), { recursive: true });
    mkdirSync(resolve(compliorDir, 'agents'), { recursive: true });
    // Write empty chain
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
    // Default run: unit tests only. E2E tests (src/e2e/) are excluded because:
    // 1. E2E tests use shared disk state (.complior/) that requires sequential execution
    // 2. With isolate: false, module mocks in unit tests conflict with E2E's real
    //    module imports (E2E imports run first, caching real modules before mocks apply)
    // Run E2E separately: npx vitest run src/e2e/ --no-file-parallelism
    include: ['src/**/*.test.ts'],
    exclude: ['src/e2e/**'],
    globals: false,
    testTimeout: 10_000,
  },
});
