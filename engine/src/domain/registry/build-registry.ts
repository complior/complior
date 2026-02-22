/**
 * Build script for AI Registry — Wave 1.
 * Reads raw seed data, classifies tools, outputs JSON files.
 *
 * Usage: npx tsx engine/src/domain/registry/build-registry.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ObligationsFileSchema } from '../../data/schemas-core.js';
import { RegistryFileSchema, DirectoryFileSchema } from '../../data/schemas-registry.js';
import { collectAndClassify, selectTop400 } from './collector.js';
import { RAW_TOOLS } from './seed-data.js';
import type { DirectoryEntry } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');
const ASSESSMENTS_DIR = join(REGISTRY_DIR, 'assessments', 'eu-ai-act');

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function main(): void {
  console.log('=== AI Registry Build — Wave 1 ===\n');

  // 1. Load obligations
  console.log('Loading obligations...');
  const oblPath = join(DATA_DIR, 'regulations', 'eu-ai-act', 'obligations.json');
  const oblRaw = JSON.parse(readFileSync(oblPath, 'utf-8'));
  const oblFile = ObligationsFileSchema.parse(oblRaw);
  console.log(`  Loaded ${oblFile.obligations.length} obligations (v${oblFile._version})\n`);

  // 2. Collect and classify
  console.log(`Processing ${RAW_TOOLS.length} raw tools...`);
  const tools = collectAndClassify(RAW_TOOLS, oblFile.obligations);
  console.log(`  Classified ${tools.length} tools (after dedup)\n`);

  // Stats
  const riskCounts: Record<string, number> = {};
  for (const t of tools) {
    const risk = t.assessments['eu-ai-act']?.risk_level ?? 'unknown';
    riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
  }
  console.log('Risk distribution:');
  for (const [risk, count] of Object.entries(riskCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${risk}: ${count}`);
  }
  console.log();

  // 3. Validate with Zod
  console.log('Validating with Zod schemas...');
  const validated = RegistryFileSchema.parse(tools);
  console.log(`  Validated ${validated.length} entries\n`);

  // 4. Write all_tools.json
  ensureDir(REGISTRY_DIR);
  const allToolsPath = join(REGISTRY_DIR, 'all_tools.json');
  writeFileSync(allToolsPath, JSON.stringify(validated, null, 2));
  console.log(`  Written: ${allToolsPath}`);
  console.log(`  Size: ${(Buffer.byteLength(JSON.stringify(validated)) / 1024 / 1024).toFixed(1)} MB\n`);

  // 5. Build directory.json (frontend summary)
  const directory: DirectoryEntry[] = tools.map(t => {
    const assessment = t.assessments['eu-ai-act'];
    return {
      slug: t.slug,
      name: t.name,
      provider: t.provider.name,
      categories: [...t.categories],
      level: t.level,
      risk_level: assessment?.risk_level ?? 'minimal',
      score: assessment?.score ?? null,
      confidence: assessment?.confidence ?? null,
      obligation_count: (assessment?.deployer_obligations.length ?? 0) +
        (assessment?.provider_obligations.length ?? 0),
      seo: t.seo,
    };
  });

  const validatedDir = DirectoryFileSchema.parse(directory);
  const dirPath = join(REGISTRY_DIR, 'directory.json');
  writeFileSync(dirPath, JSON.stringify(validatedDir, null, 2));
  console.log(`  Written: ${dirPath}`);

  // 6. Build per-jurisdiction assessment directory
  ensureDir(ASSESSMENTS_DIR);
  const assessmentDir = tools.map(t => ({
    slug: t.slug,
    name: t.name,
    risk_level: t.assessments['eu-ai-act']?.risk_level ?? 'minimal',
    score: t.assessments['eu-ai-act']?.score ?? null,
    confidence: t.assessments['eu-ai-act']?.confidence ?? null,
    obligation_count: (t.assessments['eu-ai-act']?.deployer_obligations.length ?? 0) +
      (t.assessments['eu-ai-act']?.provider_obligations.length ?? 0),
  }));
  const assessmentDirPath = join(ASSESSMENTS_DIR, 'directory.json');
  writeFileSync(assessmentDirPath, JSON.stringify(assessmentDir, null, 2));
  console.log(`  Written: ${assessmentDirPath}`);

  // 7. Select and report Top 400 for Wave 2
  const top400 = selectTop400(tools);
  console.log(`\nTop 400 for passive scan (Wave 2):`);
  const top400Risks: Record<string, number> = {};
  for (const t of top400) {
    const risk = t.assessments['eu-ai-act']?.risk_level ?? 'unknown';
    top400Risks[risk] = (top400Risks[risk] ?? 0) + 1;
  }
  for (const [risk, count] of Object.entries(top400Risks).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${risk}: ${count}`);
  }

  console.log(`\n=== Build complete ===`);
  console.log(`Total tools: ${tools.length}`);
  console.log(`All classified at level: CLASSIFIED`);
  console.log(`Ready for Wave 2 (passive scan) when API keys available.`);
}

main();
