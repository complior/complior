import type { CheckResult } from '../../../../types/common.types.js';
import type { ScanContext } from '../../../../ports/scanner.port.js';
import { INDUSTRY_PATTERNS } from '../../../../data/industry-patterns.js';
import { isSourceFile, getLineNumber } from '../../source-filter.js';

export const checkIndustryPatterns = (ctx: ScanContext): readonly CheckResult[] => {
  const sourceFiles = ctx.files.filter((f) => isSourceFile(f.relativePath, f.extension));
  const results: CheckResult[] = [];

  for (const industry of INDUSTRY_PATTERNS) {
    for (const file of sourceFiles) {
      for (const pattern of industry.patterns) {
        const match = pattern.exec(file.content);
        if (match) {
          results.push({
            type: 'fail',
            checkId: `industry-${industry.id}`,
            message: `Code matches ${industry.label} patterns (${industry.annexRef}). AI system is likely high-risk under EU AI Act ${industry.articleRef}.`,
            severity: 'high',
            obligationId: industry.obligationId,
            articleReference: industry.articleRef,
            file: file.relativePath,
            line: getLineNumber(file.content, match.index),
            fix: `This code matches ${industry.label} patterns (${industry.annexRef}). Your AI system is likely high-risk under EU AI Act. Update Agent Passport risk_class to 'high' and complete FRIA.`,
          });
        }
      }
    }
  }

  if (results.length === 0) {
    return [{
      type: 'pass',
      checkId: 'industry-detection',
      message: 'No industry-specific high-risk patterns detected',
    }];
  }

  return results;
};
