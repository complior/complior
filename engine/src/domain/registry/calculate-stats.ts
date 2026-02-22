/**
 * Calculate and display registry statistics
 */

import { readFileSync } from 'node:fs';
import type { RegistryTool } from './types.js';

const ALL_TOOLS_PATH = './data/registry/all_tools.json';

function main() {
  console.log('=== Registry Statistics ===\n');

  const allTools: RegistryTool[] = JSON.parse(readFileSync(ALL_TOOLS_PATH, 'utf-8'));
  console.log(`Total tools: ${allTools.length}`);

  // Levels
  const levels = {
    verified: allTools.filter(t => t.level === 'verified').length,
    scanned: allTools.filter(t => t.level === 'scanned').length,
    classified: allTools.filter(t => t.level === 'classified').length,
  };

  console.log('\nLevels:');
  console.log(`  - Verified: ${levels.verified}`);
  console.log(`  - Scanned: ${levels.scanned}`);
  console.log(`  - Classified: ${levels.classified}`);

  // Risk levels
  const riskLevels = {
    minimal: allTools.filter(t => t.assessments['eu-ai-act']?.risk_level === 'minimal').length,
    limited: allTools.filter(t => t.assessments['eu-ai-act']?.risk_level === 'limited').length,
    high: allTools.filter(t => t.assessments['eu-ai-act']?.risk_level === 'high').length,
    gpai: allTools.filter(t => t.assessments['eu-ai-act']?.risk_level === 'gpai').length,
    gpai_systemic: allTools.filter(t => t.assessments['eu-ai-act']?.risk_level === 'gpai_systemic').length,
    unacceptable: allTools.filter(t => t.assessments['eu-ai-act']?.risk_level === 'unacceptable').length,
  };

  console.log('\nRisk Levels:');
  console.log(`  - Minimal: ${riskLevels.minimal}`);
  console.log(`  - Limited: ${riskLevels.limited}`);
  console.log(`  - High: ${riskLevels.high}`);
  console.log(`  - GPAI: ${riskLevels.gpai}`);
  console.log(`  - GPAI Systemic: ${riskLevels.gpai_systemic}`);
  console.log(`  - Unacceptable: ${riskLevels.unacceptable}`);

  // Compliance scores
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

  console.log('\nCompliance Scores:');
  console.log(`  - Compliant (≥80): ${scoreDistribution.compliant}`);
  console.log(`  - Progressing (60-79): ${scoreDistribution.progressing}`);
  console.log(`  - Needs Improvement (40-59): ${scoreDistribution.needs_improvement}`);
  console.log(`  - Non-Compliant (<40): ${scoreDistribution.non_compliant}`);
  console.log(`  - Unscored: ${scoreDistribution.unscored}`);
  console.log(`\nTotal scored: ${totalScored}/${allTools.length} (${scoredPct}%)`);

  // Sample of scored tools
  const scoredTools = allTools.filter(t => t.assessments['eu-ai-act']?.score !== null);
  if (scoredTools.length > 0) {
    console.log('\nSample of scored tools:');
    const samples = scoredTools.slice(0, 10);
    for (const tool of samples) {
      const score = tool.assessments['eu-ai-act']?.score ?? 0;
      let grade = 'unscored';
      if (score >= 80) grade = 'compliant';
      else if (score >= 60) grade = 'progressing';
      else if (score >= 40) grade = 'needs_improvement';
      else grade = 'non_compliant';
      console.log(`  - ${tool.slug}: ${score} (${grade})`);
    }
  }
}

main();
