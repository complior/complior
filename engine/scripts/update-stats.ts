#!/usr/bin/env tsx
/**
 * Update stats.json based on current all_tools.json
 * Usage: npx tsx scripts/update-stats.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'registry');

interface RegistryTool {
  slug: string;
  level: 'verified' | 'scanned' | 'classified';
  assessments: {
    'eu-ai-act'?: {
      risk_level?: string;
      score?: number | null;
    };
  };
  evidence?: {
    passive_scan?: {
      web_search?: {
        eu_ai_act_media_mentions?: number;
      };
    };
  };
}

async function main() {
  console.log('=== Updating Registry Stats ===\n');

  // Load all_tools.json
  const allTools: RegistryTool[] = JSON.parse(
    readFileSync(join(DATA_DIR, 'all_tools.json'), 'utf-8')
  );

  console.log(`Total tools: ${allTools.length}`);

  // Count by level
  const verifiedCount = allTools.filter(t => t.level === 'verified').length;
  const scannedCount = allTools.filter(t => t.level === 'scanned').length;
  const classifiedCount = allTools.filter(t => t.level === 'classified').length;

  console.log(`  VERIFIED: ${verifiedCount}`);
  console.log(`  SCANNED: ${scannedCount}`);
  console.log(`  CLASSIFIED: ${classifiedCount}`);

  // Count systemic
  const systemicCount = allTools.filter(t =>
    t.assessments['eu-ai-act']?.risk_level === 'gpai_systemic'
  ).length;

  // Count with web search
  const withWebSearch = allTools.filter(t =>
    (t.evidence?.passive_scan?.web_search?.eu_ai_act_media_mentions ?? 0) > 0
  ).length;

  // Count GitHub stats
  const githubDir = join(DATA_DIR, 'github');
  const githubCount = existsSync(githubDir)
    ? readdirSync(githubDir).filter(f => f.endsWith('.json')).length
    : 0;

  // Score distribution
  const scoreDistribution = {
    compliant: allTools.filter(t => {
      const s = t.assessments['eu-ai-act']?.score;
      return s !== null && s !== undefined && s >= 80;
    }).length,
    progressing: allTools.filter(t => {
      const s = t.assessments['eu-ai-act']?.score;
      return s !== null && s !== undefined && s >= 60 && s < 80;
    }).length,
    needs_improvement: allTools.filter(t => {
      const s = t.assessments['eu-ai-act']?.score;
      return s !== null && s !== undefined && s >= 40 && s < 60;
    }).length,
    non_compliant: allTools.filter(t => {
      const s = t.assessments['eu-ai-act']?.score;
      return s !== null && s !== undefined && s < 40;
    }).length,
    unscored: allTools.filter(t => {
      const s = t.assessments['eu-ai-act']?.score;
      return s === null || s === undefined;
    }).length,
  };

  console.log(`  GPAI Systemic: ${systemicCount}`);
  console.log(`  With web search: ${withWebSearch}`);
  console.log(`  GitHub stats: ${githubCount}`);
  console.log(`  Scored: ${scoreDistribution.compliant + scoreDistribution.progressing + scoreDistribution.needs_improvement + scoreDistribution.non_compliant}`);

  // Create stats object
  const stats = {
    total_tools: allTools.length,
    verified: verifiedCount,
    scanned: scannedCount,
    classified: classifiedCount,
    gpai_systemic: systemicCount,
    tools_with_web_search: withWebSearch,
    github_stats: githubCount,
    built_at: new Date().toISOString(),
    score_distribution: scoreDistribution,
  };

  // Save stats.json
  writeFileSync(join(DATA_DIR, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log('\n✅ Updated stats.json');
}

main().catch(console.error);
