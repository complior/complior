#!/usr/bin/env tsx
/**
 * Helper script to update visible_watermark field in human-tests/results.json
 * Usage: npx tsx scripts/update-watermarks.ts --dalle=false --stability=false
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'registry');
const HUMAN_TESTS_DIR = join(DATA_DIR, 'human-tests');
const RESULTS_FILE = join(HUMAN_TESTS_DIR, 'results.json');

interface HumanTestResult {
  slug: string;
  visible_watermark?: boolean;
  [key: string]: unknown;
}

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

async function main() {
  console.log('=== Updating Visible Watermark Fields ===\n');

  const args = parseArgs();

  if (args.dalle === undefined && args.stability === undefined) {
    console.log('Usage: npx tsx scripts/update-watermarks.ts --dalle=<true|false> --stability=<true|false>');
    console.log('\nExample:');
    console.log('  npx tsx scripts/update-watermarks.ts --dalle=false --stability=false');
    console.log('  npx tsx scripts/update-watermarks.ts --dalle=true');
    return;
  }

  // Load results.json
  const results: HumanTestResult[] = JSON.parse(readFileSync(RESULTS_FILE, 'utf-8'));
  console.log(`Loaded ${results.length} test results\n`);

  let updated = 0;

  // Update DALL-E
  if (args.dalle !== undefined) {
    const dalle = results.find(r => r.slug === 'dall-e-3');
    if (dalle) {
      dalle.visible_watermark = args.dalle;
      updated++;
      console.log(`✓ dall-e-3: visible_watermark = ${args.dalle}`);
    } else {
      console.log('⚠️  dall-e-3 not found in results.json');
    }
  }

  // Update Stability AI
  if (args.stability !== undefined) {
    const stability = results.find(r => r.slug === 'stable-diffusion');
    if (stability) {
      stability.visible_watermark = args.stability;
      updated++;
      console.log(`✓ stable-diffusion: visible_watermark = ${args.stability}`);
    } else {
      console.log('⚠️  stable-diffusion not found in results.json');
    }
  }

  // Save updated results
  if (updated > 0) {
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2) + '\n');
    console.log(`\n✅ Updated ${updated} watermark fields in results.json`);
  } else {
    console.log('\n⚠️  No updates made');
  }
}

main().catch(console.error);
