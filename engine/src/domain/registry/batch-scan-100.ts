/**
 * Batch Passive Scan for Top 100 Priority Tools
 *
 * Reads /tmp/scan_queue.json, runs passive scans, applies to registry,
 * re-scores, and updates all_tools.json with compliance analysis.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { scanTool } from './passive-scan/scan-tool.js';
import { applyPassiveScanToTool } from './score.js';
import type { RegistryTool, PassiveScanData } from './types.js';

const SCAN_QUEUE_PATH = '/tmp/scan_queue.json';
const ALL_TOOLS_PATH = './data/registry/all_tools.json';
const DELAY_MS = 2000; // 2s between scans to avoid rate limiting

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Batch Passive Scan for Top 100 Priority Tools ===\n');

  // 1. Load scan queue
  console.log('Loading scan queue from', SCAN_QUEUE_PATH);
  const queueData = JSON.parse(readFileSync(SCAN_QUEUE_PATH, 'utf-8')) as Array<{
    slug: string;
    website: string;
    name: string;
  }>;
  console.log(`Queue loaded: ${queueData.length} tools\n`);

  // 2. Load all tools
  console.log('Loading all tools from', ALL_TOOLS_PATH);
  const allTools: RegistryTool[] = JSON.parse(readFileSync(ALL_TOOLS_PATH, 'utf-8'));
  console.log(`All tools loaded: ${allTools.length} total\n`);

  // 3. Create slug→tool lookup
  const toolsBySlog = new Map<string, number>();
  for (let i = 0; i < allTools.length; i++) {
    toolsBySlog.set(allTools[i]!.slug, i);
  }

  // 4. Batch scan
  console.log('Starting batch scan...\n');
  let scanned = 0;
  let failed = 0;

  for (let i = 0; i < queueData.length; i++) {
    const item = queueData[i]!;
    const idx = toolsBySlog.get(item.slug);

    if (idx === undefined) {
      console.log(`[${i + 1}/${queueData.length}] SKIP: ${item.slug} - not found in registry`);
      failed++;
      continue;
    }

    const tool = allTools[idx]!;

    console.log(`[${i + 1}/${queueData.length}] Scanning: ${tool.slug} (${tool.website})`);

    try {
      // Run passive scan
      const passiveScan: PassiveScanData = await scanTool(tool);

      // Check if we actually fetched any pages
      if (passiveScan.pages_fetched === 0) {
        console.log(`  ⚠️  No pages fetched (website unreachable?)`);
        failed++;
      } else {
        console.log(`  ✓ Fetched ${passiveScan.pages_fetched} pages`);
        console.log(`    - Disclosure: ${passiveScan.disclosure.visible ? 'VISIBLE' : 'not visible'}`);
        console.log(`    - Privacy policy: ${passiveScan.privacy_policy.mentions_ai ? 'mentions AI' : 'no AI mention'}`);
        console.log(`    - GDPR: ${passiveScan.privacy_policy.gdpr_compliant ? 'compliant' : 'not mentioned'}`);
        console.log(`    - Certifications: ${passiveScan.trust.certifications.join(', ') || 'none'}`);

        // Apply scan to tool (this will also score it)
        const updated = applyPassiveScanToTool(
          { ...tool, level: 'classified' } as RegistryTool,
          passiveScan,
          null, // no LLM tests
        );

        // Update tool in registry
        allTools[idx] = {
          ...updated,
          // Don't downgrade verified tools
          level: tool.level === 'verified' ? 'verified' : updated.level,
        };

        const score = updated.assessments['eu-ai-act']?.score ?? null;
        let grade = 'unscored';
        if (score !== null) {
          if (score >= 80) grade = 'compliant';
          else if (score >= 60) grade = 'progressing';
          else if (score >= 40) grade = 'needs_improvement';
          else grade = 'non_compliant';
        }
        console.log(`    - Score: ${score !== null ? score : 'N/A'} (${grade})`);

        scanned++;
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    // Rate limiting delay (except for last item)
    if (i < queueData.length - 1) {
      await delay(DELAY_MS);
    }
  }

  console.log('\n=== Scan Complete ===');
  console.log(`Successfully scanned: ${scanned}`);
  console.log(`Failed/skipped: ${failed}`);
  console.log(`Total: ${queueData.length}`);

  // 5. Save updated registry
  console.log('\nSaving updated registry to', ALL_TOOLS_PATH);
  writeFileSync(ALL_TOOLS_PATH, JSON.stringify(allTools, null, 2), 'utf-8');

  // 6. Calculate new statistics
  const levels = {
    verified: allTools.filter(t => t.level === 'verified').length,
    scanned: allTools.filter(t => t.level === 'scanned').length,
    classified: allTools.filter(t => t.level === 'classified').length,
  };

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

  const totalScored = scoreDistribution.compliant + scoreDistribution.progressing +
    scoreDistribution.needs_improvement + scoreDistribution.non_compliant;
  const scoredPct = ((totalScored / allTools.length) * 100).toFixed(1);

  console.log('\n=== Updated Statistics ===');
  console.log('Levels:');
  console.log(`  - Verified: ${levels.verified}`);
  console.log(`  - Scanned: ${levels.scanned}`);
  console.log(`  - Classified: ${levels.classified}`);
  console.log('\nCompliance Scores:');
  console.log(`  - Compliant (≥80): ${scoreDistribution.compliant}`);
  console.log(`  - Progressing (60-79): ${scoreDistribution.progressing}`);
  console.log(`  - Needs Improvement (40-59): ${scoreDistribution.needs_improvement}`);
  console.log(`  - Non-Compliant (<40): ${scoreDistribution.non_compliant}`);
  console.log(`  - Unscored: ${scoreDistribution.unscored}`);
  console.log(`\nTotal scored: ${totalScored}/${allTools.length} (${scoredPct}%)`);

  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
