import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { filterPassportManifests, extractRiskClass } from '../../passport/builder/manifest-files.js';

const CHECK_ID = 'behavioral-constraints';
const ARTICLE_REF_ESCALATION = 'Art. 14(4)';
const ARTICLE_REF_DATA = 'Art. 9(2)';
const OBLIGATION_ID_ESCALATION = 'eu-ai-act-OBL-014';
const OBLIGATION_ID_DATA = 'eu-ai-act-OBL-009';

const checkEscalation = (
  manifest: Record<string, unknown>,
  isHighRisk: boolean,
  name: string,
  filePath: string,
): CheckResult | undefined => {
  if (!isHighRisk) return undefined;

  const constraints = manifest.constraints as Record<string, unknown> | undefined;
  const rules = constraints?.escalation_rules as unknown[] | undefined;

  if (!rules || rules.length === 0) {
    return {
      type: 'fail',
      checkId: CHECK_ID,
      message: `Missing escalation rules for high-risk agent: ${name} (${ARTICLE_REF_ESCALATION})`,
      severity: 'high',
      obligationId: OBLIGATION_ID_ESCALATION,
      articleReference: ARTICLE_REF_ESCALATION,
      fix: 'Add constraints.escalation_rules to passport with structured human oversight measures',
      file: filePath,
    };
  }

  return { type: 'pass', checkId: CHECK_ID, message: `Escalation rules defined for high-risk agent: ${name}` };
};

const checkDataBoundary = (
  manifest: Record<string, unknown>,
  isHighRisk: boolean,
  name: string,
  filePath: string,
): CheckResult => {
  const permissions = manifest.permissions as Record<string, unknown> | undefined;
  const boundaries = permissions?.data_boundaries as Record<string, unknown> | undefined;

  if (!boundaries || !boundaries.pii_handling) {
    return {
      type: 'fail',
      checkId: CHECK_ID,
      message: `Missing data boundaries for agent: ${name} (${ARTICLE_REF_DATA})`,
      severity: isHighRisk ? 'high' : 'medium',
      obligationId: OBLIGATION_ID_DATA,
      articleReference: ARTICLE_REF_DATA,
      fix: 'Add permissions.data_boundaries with pii_handling mode to passport',
      file: filePath,
    };
  }

  return { type: 'pass', checkId: CHECK_ID, message: `Data boundaries defined for agent: ${name}` };
};

export const checkBehavioralConstraints = (ctx: ScanContext): readonly CheckResult[] => {
  const passportFiles = filterPassportManifests(ctx.files);
  if (passportFiles.length === 0) return [];

  const results: CheckResult[] = [];

  for (const file of passportFiles) {
    try {
      const manifest = JSON.parse(file.content) as Record<string, unknown>;
      const riskClass = extractRiskClass(manifest);
      const isHighRisk = riskClass === 'high' || riskClass === 'prohibited';
      const name = (manifest.name as string) ?? file.relativePath;

      const escalationResult = checkEscalation(manifest, isHighRisk, name, file.relativePath);
      if (escalationResult) results.push(escalationResult);

      results.push(checkDataBoundary(manifest, isHighRisk, name, file.relativePath));
    } catch {
      // Invalid JSON — skip silently, passport-presence handles parse errors
    }
  }

  return results;
};
