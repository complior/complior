#!/usr/bin/env tsx
/**
 * Helper script to update screenshot paths in human-tests/results.json
 * Usage: npx tsx scripts/update-screenshots.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'registry');
const HUMAN_TESTS_DIR = join(DATA_DIR, 'human-tests');
const SCREENSHOTS_DIR = join(HUMAN_TESTS_DIR, 'screenshots');
const RESULTS_FILE = join(HUMAN_TESTS_DIR, 'results.json');

// Mapping screenshot filenames to tool slugs
const SCREENSHOT_TO_SLUG: Record<string, string> = {
  'chatgpt.png': 'chatgpt',
  'claude.png': 'claude',
  'gemini.png': 'gemini',
  'copilot.png': 'microsoft-copilot',
  'perplexity.png': 'perplexity-ai',
  'notion.png': 'notion-ai',
  'grammarly.png': 'grammarly',
  'jasper.png': 'jasper',
  'dall-e-interface.png': 'dall-e-3',
  'stability-interface.png': 'stable-diffusion',
  'elevenlabs-interface.png': 'elevenlabs',
  'midjourney-interface.png': 'midjourney',
  'elevenlabs-consent.png': 'elevenlabs',
  'chatgpt-optout.png': 'chatgpt',
  'synthesia-interface.png': 'synthesia',
  'dall-e-sample.png': 'dall-e-3',
  'stability-sample.png': 'stable-diffusion',
  'perplexity-memory-test.png': 'perplexity-ai',
};

interface HumanTestResult {
  slug: string;
  screenshot_path: string | null;
  visible_watermark?: boolean;
  [key: string]: unknown;
}

async function main() {
  console.log('=== Updating Screenshot Paths ===\n');

  // Load results.json
  const results: HumanTestResult[] = JSON.parse(readFileSync(RESULTS_FILE, 'utf-8'));
  console.log(`Loaded ${results.length} test results`);

  // Check which screenshots exist
  let files: string[] = [];
  try {
    files = readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`Found ${files.length} screenshot files\n`);
  } catch {
    console.log('No screenshots directory found\n');
    return;
  }

  // Update results
  let updated = 0;
  for (const file of files) {
    const slug = SCREENSHOT_TO_SLUG[file];
    if (!slug) {
      console.log(`⚠️  Unknown screenshot: ${file}`);
      continue;
    }

    const entry = results.find(r => r.slug === slug);
    if (!entry) {
      console.log(`⚠️  No result entry for slug: ${slug} (file: ${file})`);
      continue;
    }

    const relativePath = `screenshots/${file}`;
    if (entry.screenshot_path !== relativePath) {
      entry.screenshot_path = relativePath;
      updated++;
      console.log(`✓ ${slug}: ${relativePath}`);
    }
  }

  // Save updated results
  if (updated > 0) {
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2) + '\n');
    console.log(`\n✅ Updated ${updated} screenshot paths in results.json`);
  } else {
    console.log('\n⚠️  No updates needed');
  }

  // Report missing screenshots
  const requiredScreenshots = [
    'chatgpt.png',
    'claude.png',
    'gemini.png',
    'copilot.png',
    'perplexity.png',
    'notion.png',
    'grammarly.png',
    'jasper.png',
    'dall-e-interface.png',
    'stability-interface.png',
    'elevenlabs-interface.png',
    'midjourney-interface.png',
    'elevenlabs-consent.png',
    'chatgpt-optout.png',
    'synthesia-interface.png',
  ];

  const missing = requiredScreenshots.filter(s => !files.includes(s));
  if (missing.length > 0) {
    console.log(`\n❌ Missing screenshots (${missing.length}/15):`);
    missing.forEach(s => console.log(`   - ${s}`));
  } else {
    console.log('\n✅ All 15 required screenshots present!');
  }
}

main().catch(console.error);
