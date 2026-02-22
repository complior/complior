#!/usr/bin/env tsx
/**
 * Restore VERIFIED status for tools that have files in verified/ directory
 * Usage: npx tsx scripts/restore-verified-status.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'registry');
const VERIFIED_DIR = join(DATA_DIR, 'verified');
const ALL_TOOLS_FILE = join(DATA_DIR, 'all_tools.json');

interface RegistryTool {
  slug: string;
  level: 'verified' | 'scanned' | 'classified';
  [key: string]: unknown;
}

async function main() {
  console.log('=== Restoring VERIFIED Status ===\n');

  // Get list of slugs that have verified files
  const verifiedFiles = readdirSync(VERIFIED_DIR).filter(f => f.endsWith('.json'));
  const verifiedSlugs = new Set(verifiedFiles.map(f => f.replace('.json', '')));
  console.log(`Found ${verifiedSlugs.size} tools in verified/ directory`);

  // Load all_tools.json
  const allTools: RegistryTool[] = JSON.parse(readFileSync(ALL_TOOLS_FILE, 'utf-8'));
  console.log(`Loaded ${allTools.length} tools from all_tools.json\n`);

  // Count current verified
  const currentVerified = allTools.filter(t => t.level === 'verified').length;
  console.log(`Current VERIFIED count: ${currentVerified}`);

  // Update tools to verified if they have a file in verified/
  let updated = 0;
  for (let i = 0; i < allTools.length; i++) {
    const tool = allTools[i]!;
    if (verifiedSlugs.has(tool.slug) && tool.level !== 'verified') {
      allTools[i] = { ...tool, level: 'verified' };
      updated++;
      console.log(`  ✓ ${tool.slug}: ${tool.level} → verified`);
    }
  }

  console.log(`\nUpdated ${updated} tools to VERIFIED status`);

  // Save updated all_tools.json
  if (updated > 0) {
    writeFileSync(ALL_TOOLS_FILE, JSON.stringify(allTools, null, 2));
    console.log('\n✅ Saved updated all_tools.json');

    const newVerified = allTools.filter(t => t.level === 'verified').length;
    console.log(`New VERIFIED count: ${newVerified} (was: ${currentVerified})`);
  } else {
    console.log('\n⚠️  No updates needed');
  }
}

main().catch(console.error);
