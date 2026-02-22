#!/usr/bin/env tsx
/**
 * Final integration script - runs after user completes manual tests
 *
 * This script:
 * 1. Updates screenshot paths in results.json
 * 2. Optionally updates watermark results (pass --dalle and --stability flags)
 * 3. Runs final build-wave3 assembly
 * 4. Verifies 100% completion
 *
 * Usage:
 *   npx tsx scripts/finalize-registry.ts
 *   npx tsx scripts/finalize-registry.ts --dalle=false --stability=false
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(): { dalle?: boolean; stability?: boolean } {
  const args = process.argv.slice(2);
  const result: { dalle?: boolean; stability?: boolean } = {};

  for (const arg of args) {
    if (arg.startsWith('--dalle=')) {
      result.dalle = arg.split('=')[1] === 'true';
    } else if (arg.startsWith('--stability=')) {
      result.stability = arg.split('=')[1] === 'true';
    }
  }

  return result;
}

function run(command: string, description: string) {
  console.log(`\n>>> ${description}`);
  console.log(`    $ ${command}\n`);
  try {
    execSync(command, { stdio: 'inherit', cwd: join(__dirname, '..') });
  } catch (error) {
    console.error(`\n❌ Failed: ${description}`);
    throw error;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   AI Registry — Final Integration & Assembly     ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const args = parseArgs();

  // Step 1: Update screenshot paths
  console.log('📸 Step 1/5: Updating screenshot paths...');
  run('npx tsx scripts/update-screenshots.ts', 'Update screenshot paths');

  // Step 2: Update watermark results (if provided)
  if (args.dalle !== undefined || args.stability !== undefined) {
    console.log('\n🎨 Step 2/5: Updating watermark results...');
    let watermarkCmd = 'npx tsx scripts/update-watermarks.ts';
    if (args.dalle !== undefined) watermarkCmd += ` --dalle=${args.dalle}`;
    if (args.stability !== undefined) watermarkCmd += ` --stability=${args.stability}`;
    run(watermarkCmd, 'Update watermark results');
  } else {
    console.log('\n🎨 Step 2/5: Skipping watermark update (no --dalle or --stability flags)');
  }

  // Step 3: Restore VERIFIED status (safety check)
  console.log('\n🔄 Step 3/5: Ensuring VERIFIED status...');
  run('npx tsx scripts/restore-verified-status.ts', 'Restore VERIFIED status');

  // Step 4: Update stats
  console.log('\n📊 Step 4/5: Updating registry statistics...');
  run('npx tsx scripts/update-stats.ts', 'Update stats.json');

  // Step 5: Final verification
  console.log('\n✅ Step 5/5: Running completion verification...');
  try {
    run('npx tsx scripts/verify-completion.ts', 'Verify 100% completion');
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║      ✅  100% COMPLETION ACHIEVED!                ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║      ⚠️   MANUAL WORK STILL REQUIRED             ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    throw error;
  }

  // Show final summary
  console.log('\n📋 Final Summary:\n');
  const statsPath = join(__dirname, '..', 'data', 'registry', 'stats.json');
  const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));

  console.log(`   Total tools: ${stats.total_tools}`);
  console.log(`   VERIFIED: ${stats.verified}`);
  console.log(`   SCANNED: ${stats.scanned}`);
  console.log(`   CLASSIFIED: ${stats.classified}`);
  console.log(`   GPAI Systemic: ${stats.gpai_systemic}`);
  console.log(`   Scored: ${stats.score_distribution.compliant + stats.score_distribution.progressing + stats.score_distribution.needs_improvement + stats.score_distribution.non_compliant}`);
  console.log(`\n   Registry ready at: data/registry/directory.json`);
  console.log(`   Built: ${stats.built_at}\n`);
}

main().catch((error) => {
  console.error('\n💥 Finalization failed');
  process.exit(1);
});
