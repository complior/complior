import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { rmSync, writeFileSync, existsSync } from 'node:fs';

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

// Reset evidence chain before E2E tests to avoid stale key conflicts
// Uses SYNC operations so the chain is cleared BEFORE vitest starts running tests
const testProject = process.env['COMPLIOR_TEST_PROJECT'] ?? '';
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
    include: ['src/**/*.test.ts'],
    globals: false,
    testTimeout: 10_000,
  },
});
