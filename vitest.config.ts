import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { rmSync, writeFileSync, existsSync } from 'node:fs';

// Load .env from workspace root so COMPLIOR_TEST_PROJECT is available
const loadEnv = (): Record<string, string> => {
  const envPath = resolve(process.cwd(), '.env');
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
  const chainPath = resolve(testProject, '.complior', 'evidence', 'chain.json');
  try {
    if (existsSync(chainPath)) {
      rmSync(chainPath, { force: true });
    }
  } catch { /* non-fatal */ }
  try {
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
    include: ['engine/core/src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/.complior/**',
      'engine/core/node_modules/**',
    ],
  },
});
