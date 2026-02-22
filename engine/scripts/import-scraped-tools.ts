#!/usr/bin/env tsx
/**
 * Import scraped tools into all_tools.json with minimal structure
 * They will be classified by Wave 1
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'registry');

interface ScrapedTool {
  slug: string;
  name: string;
  provider: { name: string; website: string };
  website: string;
  categories: string[];
  description: string;
  source: string;
  rank_on_source: number;
}

interface RegistryTool {
  slug: string;
  name: string;
  provider: { name: string; website: string };
  website: string;
  categories: string[];
  description: string;
  source: string;
  rank_on_source: number;
  level: 'classified';
  priority_score: number;
  assessments: {};
  evidence: {};
  updated_at: string;
}

async function main() {
  console.log('=== Import Scraped Tools ===\n');

  // Load scraped tools
  const scrapedPath = join(DATA_DIR, 'scraped-tools.json');
  const scrapedTools: ScrapedTool[] = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
  console.log(`Scraped tools: ${scrapedTools.length}`);

  // Load existing registry
  const allToolsPath = join(DATA_DIR, 'all_tools.json');
  const allTools: RegistryTool[] = JSON.parse(readFileSync(allToolsPath, 'utf-8'));
  console.log(`Existing tools: ${allTools.length}`);

  // Convert scraped → registry format
  const newTools: RegistryTool[] = scrapedTools.map((tool, idx) => ({
    slug: tool.slug,
    name: tool.name,
    provider: tool.provider,
    website: tool.website,
    categories: tool.categories,
    description: tool.description,
    source: tool.source,
    rank_on_source: tool.rank_on_source,
    level: 'classified' as const,
    priority_score: 0.1, // Low priority until classified
    assessments: {},
    evidence: {},
    updated_at: new Date().toISOString(),
  }));

  console.log(`New tools to add: ${newTools.length}`);

  // Merge
  const merged = [...allTools, ...newTools];
  console.log(`Total tools after merge: ${merged.length}`);

  // Save
  writeFileSync(allToolsPath, JSON.stringify(merged, null, 2));

  console.log(`\n✅ Imported ${newTools.length} tools into registry`);
  console.log(`Total registry size: ${merged.length}`);
  console.log(`\nNext: Run Wave 1 classification`);
  console.log(`  npx tsx src/domain/registry/classify-new-tools.ts`);
}

main().catch(console.error);
