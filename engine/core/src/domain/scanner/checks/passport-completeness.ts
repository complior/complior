import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { filterPassportManifests, extractRiskClass } from '../../passport/builder/manifest-files.js';
import { OBLIGATION_FIELD_MAP, getFieldValue, isNonEmpty } from '../../passport/obligation-field-map.js';

const CHECK_ID = 'passport-completeness';
const ARTICLE_REF = 'Art. 26(4)';
const OBLIGATION_ID = 'eu-ai-act-OBL-011';

/** Deep-path fields required for all risk levels. */
const BASE_FIELDS = OBLIGATION_FIELD_MAP.filter((m) => m.required).map((m) => m.field);

/** Additional fields required for high-risk / prohibited passports. */
const HIGH_RISK_EXTRA = ['oversight.responsible_person', 'oversight.override_mechanism'] as const;

const countDeepFields = (manifest: Record<string, unknown>, fields: readonly string[]): number => {
  let filled = 0;
  for (const fieldPath of fields) {
    const value = getFieldValue(manifest as never, fieldPath);
    if (isNonEmpty(value)) {
      filled++;
    }
  }
  return filled;
};

export const checkPassportCompleteness = (ctx: ScanContext): readonly CheckResult[] => {
  const passportFiles = filterPassportManifests(ctx.files);

  if (passportFiles.length === 0) {
    return [];
  }

  const results: CheckResult[] = [];

  for (const file of passportFiles) {
    try {
      const manifest = JSON.parse(file.content) as Record<string, unknown>;
      const risk = extractRiskClass(manifest);

      const requiredFields = risk === 'high' || risk === 'prohibited'
        ? [...BASE_FIELDS, ...HIGH_RISK_EXTRA]
        : BASE_FIELDS;
      const totalRequired = requiredFields.length;
      const filled = countDeepFields(manifest, requiredFields);
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
          fix: `Fill missing passport fields using \`complior passport init --force\` or manual edit`,
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
        fix: 'Regenerate passport with `complior passport init --force`',
        file: file.relativePath,
      });
    }
  }

  return results;
};
