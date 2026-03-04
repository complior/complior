import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const CHECK_ID = 'passport-completeness';
const ARTICLE_REF = 'Art. 26(4)';
const OBLIGATION_ID = 'eu-ai-act-OBL-011';

const ALL_FIELDS = [
  'name', 'display_name', 'version', 'description', 'agent_id',
  'type', 'framework', 'autonomy_level',
  'model', 'owner', 'permissions', 'constraints',
  'compliance', 'signature', 'source',
  'autonomy_evidence', 'logging', 'lifecycle',
] as const;

const HIGH_RISK_FIELDS = ALL_FIELDS;
const LIMITED_RISK_FIELDS = ALL_FIELDS.slice(0, 12);

const countFields = (manifest: Record<string, unknown>, fields: readonly string[]): number => {
  let filled = 0;
  for (const field of fields) {
    const value = manifest[field];
    if (value !== undefined && value !== null && value !== '') {
      filled++;
    }
  }
  return filled;
};

export const checkPassportCompleteness = (ctx: ScanContext): readonly CheckResult[] => {
  const passportFiles = ctx.files.filter((f) =>
    f.relativePath.includes('.complior/agents/') &&
    f.relativePath.endsWith('-manifest.json'),
  );

  if (passportFiles.length === 0) {
    return [];
  }

  const results: CheckResult[] = [];

  for (const file of passportFiles) {
    try {
      const manifest = JSON.parse(file.content) as Record<string, unknown>;
      const riskClass = (manifest.compliance as Record<string, unknown> | undefined)
        ?.eu_ai_act as Record<string, unknown> | undefined;
      const risk = (riskClass?.risk_class as string) ?? 'limited';

      const requiredFields = risk === 'high' || risk === 'prohibited'
        ? HIGH_RISK_FIELDS
        : LIMITED_RISK_FIELDS;
      const totalRequired = requiredFields.length;
      const filled = countFields(manifest, requiredFields);
      const pct = Math.round((filled / totalRequired) * 100);
      const name = (manifest.name as string) ?? file.relativePath;

      if (pct >= 100) {
        results.push({
          type: 'pass',
          checkId: CHECK_ID,
          message: `Passport Completeness: ${pct}% (${filled}/${totalRequired} fields) — ${name}`,
        });
      } else {
        results.push({
          type: 'fail',
          checkId: CHECK_ID,
          message: `Passport Completeness: ${pct}% (${filled}/${totalRequired} fields) — ${name} (${ARTICLE_REF})`,
          severity: pct < 50 ? 'high' : 'medium',
          obligationId: OBLIGATION_ID,
          articleReference: ARTICLE_REF,
          fix: `Fill missing passport fields using \`complior agent init --force\` or manual edit`,
          file: file.relativePath,
        });
      }
    } catch {
      results.push({
        type: 'fail',
        checkId: CHECK_ID,
        message: `Invalid passport manifest: ${file.relativePath}`,
        severity: 'high',
        obligationId: OBLIGATION_ID,
        articleReference: ARTICLE_REF,
        fix: 'Regenerate passport with `complior agent init --force`',
        file: file.relativePath,
      });
    }
  }

  return results;
};
