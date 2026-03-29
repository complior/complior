import type { Finding, Severity, ExternalToolName } from '../../../types/common.types.js';
import type { RawExternalFinding } from './runner-port.js';
import {
  EXTERNAL_RULE_MAPPINGS,
  SEMGREP_SEVERITY_MAP,
  BANDIT_SEVERITY_MAP,
} from './mappings.js';

/** Map a raw external finding to a Complior Finding. */
export const mapExternalFinding = (
  raw: RawExternalFinding,
  tool: ExternalToolName,
): Finding => {
  const mapping = resolveMapping(raw.ruleId, raw.severity, tool);

  // Bare-call findings are informational, not compliance violations
  const isBareCall = raw.ruleId.includes('bare-call');

  return {
    checkId: `ext-${tool}-${sanitizeRuleId(raw.ruleId)}`,
    type: isBareCall ? 'info' : 'fail',
    message: raw.message,
    severity: mapping.severity,
    file: raw.file,
    line: raw.line,
    obligationId: mapping.obligationId,
    articleReference: mapping.articleReference,
    fix: generateFixSuggestion(tool, raw),
  };
};

/** Map all raw findings from a tool to Complior Findings. */
export const mapExternalFindings = (
  rawFindings: readonly RawExternalFinding[],
  tool: ExternalToolName,
): readonly Finding[] => {
  return rawFindings
    // Filter out findings from .complior/ backup files (belt-and-suspenders — tool exclusion may not work)
    .filter((raw) => !raw.file.includes('.complior/') && !raw.file.includes('.complior\\'))
    .map((raw) => mapExternalFinding(raw, tool));
};

// --- Internal helpers ---

interface ResolvedMapping {
  readonly severity: Severity;
  readonly obligationId?: string;
  readonly articleReference?: string;
}

const resolveMapping = (
  ruleId: string,
  rawSeverity: string,
  tool: ExternalToolName,
): ResolvedMapping => {
  // 1. Try exact rule ID match
  const exact = EXTERNAL_RULE_MAPPINGS[ruleId];
  if (exact) {
    return {
      severity: exact.defaultSeverity,
      obligationId: exact.obligationId,
      articleReference: exact.articleReference,
    };
  }

  // 2. Try prefix match for Semgrep rules
  if (tool === 'semgrep') {
    for (const [prefix, mapping] of Object.entries(EXTERNAL_RULE_MAPPINGS)) {
      if (ruleId.startsWith(prefix)) {
        return {
          severity: SEMGREP_SEVERITY_MAP[rawSeverity.toUpperCase()] ?? mapping.defaultSeverity,
          obligationId: mapping.obligationId,
          articleReference: mapping.articleReference,
        };
      }
    }
    return {
      severity: SEMGREP_SEVERITY_MAP[rawSeverity.toUpperCase()] ?? 'medium',
    };
  }

  // 3. Bandit — map by severity level
  if (tool === 'bandit') {
    const key = `bandit-${rawSeverity.toLowerCase()}`;
    const mapping = EXTERNAL_RULE_MAPPINGS[key];
    return {
      severity: BANDIT_SEVERITY_MAP[rawSeverity.toUpperCase()] ?? 'medium',
      obligationId: mapping?.obligationId,
      articleReference: mapping?.articleReference,
    };
  }

  // 4. ModelScan
  if (tool === 'modelscan') {
    const key = rawSeverity.toLowerCase() === 'critical' ? 'modelscan-unsafe' : 'modelscan-warning';
    const mapping = EXTERNAL_RULE_MAPPINGS[key]!;
    return {
      severity: mapping.defaultSeverity,
      obligationId: mapping.obligationId,
      articleReference: mapping.articleReference,
    };
  }

  // 5. detect-secrets
  if (tool === 'detect-secrets') {
    const mapping = EXTERNAL_RULE_MAPPINGS['detect-secrets']!;
    return {
      severity: mapping.defaultSeverity,
      obligationId: mapping.obligationId,
      articleReference: mapping.articleReference,
    };
  }

  return { severity: 'medium' };
};

const sanitizeRuleId = (ruleId: string): string => {
  return ruleId
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
};

const generateFixSuggestion = (tool: ExternalToolName, raw: RawExternalFinding): string => {
  switch (tool) {
    case 'semgrep':
      return `Fix ${raw.ruleId}: ${raw.message.slice(0, 100)}`;
    case 'bandit':
      return `Fix Python security issue ${raw.ruleId}: ${raw.message.slice(0, 100)}`;
    case 'modelscan':
      return `Unsafe model operation detected — convert to SafeTensors or validate model provenance`;
    case 'detect-secrets':
      return `Remove or rotate detected secret (${raw.ruleId}) and use environment variables`;
    default:
      return raw.message.slice(0, 100);
  }
};
