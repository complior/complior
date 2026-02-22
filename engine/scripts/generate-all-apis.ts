#!/usr/bin/env tsx
/**
 * Generate API JSONs for all VERIFIED and SCANNED tools
 * Usage: npx tsx scripts/generate-all-apis.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');

interface RegistryTool {
  slug: string;
  name: string;
  level: string;
}

async function main() {
  console.log('=== Generating API JSONs for all tools ===\n');

  // Ensure API directory exists
  mkdirSync(join(REGISTRY_DIR, 'api'), { recursive: true });

  // Load all tools
  const allTools: RegistryTool[] = JSON.parse(
    readFileSync(join(REGISTRY_DIR, 'all_tools.json'), 'utf-8')
  );

  // Filter VERIFIED and SCANNED
  const toolsToGenerate = allTools.filter(t =>
    t.level === 'verified' || t.level === 'scanned'
  );

  console.log(`Found ${toolsToGenerate.length} tools to generate:`);
  console.log(`  VERIFIED: ${allTools.filter(t => t.level === 'verified').length}`);
  console.log(`  SCANNED: ${allTools.filter(t => t.level === 'scanned').length}`);
  console.log();

  let generated = 0;
  let failed = 0;

  for (const tool of toolsToGenerate) {
    try {
      execSync(`npx tsx scripts/generate-tool-api.ts ${tool.slug}`, {
        stdio: 'pipe',
        cwd: join(__dirname, '..'),
      });
      generated++;
      if (generated % 10 === 0) {
        console.log(`  Progress: ${generated}/${toolsToGenerate.length}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed: ${tool.slug}`);
      failed++;
    }
  }

  console.log(`\n✅ Generated: ${generated} API JSONs`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
  console.log(`\nFiles saved to: data/registry/api/`);
}

main().catch(console.error);
