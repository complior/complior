import type { AgentPassport } from '../../types/passport.types.js';
import type { CompletenessResult } from '../passport/passport-validator.js';
import type { ScanResult } from '../../types/common.types.js';
import type { EvidenceChainSummary } from '../scanner/evidence-store.js';
import { INDUSTRY_PATTERNS } from '../../data/industry-patterns.js';

// --- Constants ---

const WEIGHT_COMPLIANCE = 0.4;
const WEIGHT_COMPLETENESS = 0.3;
const BONUS_FRIA = 15;
const BONUS_EVIDENCE = 15;

const GRADE_A_THRESHOLD = 90;
const GRADE_B_THRESHOLD = 75;
const GRADE_C_THRESHOLD = 60;
const GRADE_D_THRESHOLD = 40;

const COMPLETENESS_WARNING_THRESHOLD = 80;

const INDUSTRY_PREFIX = 'industry-';

/** Canonical set of high-risk industry IDs, derived from INDUSTRY_PATTERNS */
const HIGH_RISK_INDUSTRY_IDS = new Set(INDUSTRY_PATTERNS.map((p) => p.id));

// --- Input / Output types ---

export interface AgentRegistryInput {
  readonly passport: AgentPassport;
  readonly completeness: CompletenessResult;
  readonly scanResult: ScanResult | null;
  readonly evidenceSummary: EvidenceChainSummary;
}

export interface AgentRegistryEntry {
  readonly name: string;
  readonly displayName: string;
  readonly agentId: string;
  readonly riskClass: string;
  readonly autonomyLevel: string;
  readonly framework: string;
  readonly passportCompleteness: number;
  readonly complianceScore: number;
  readonly friaStatus: 'completed' | 'pending';
  readonly evidenceChain: {
    readonly entries: number;
    readonly valid: boolean;
  };
  readonly detectedIndustries: readonly string[];
  readonly grade: 'A' | 'B' | 'C' | 'D' | 'F';
  readonly issues: readonly string[];
}

// --- Helpers ---

const extractIndustries = (scanResult: ScanResult | null): readonly string[] => {
  if (!scanResult) return [];
  const industries = new Set<string>();
  for (const finding of scanResult.findings) {
    if (finding.type === 'fail' && finding.checkId.startsWith(INDUSTRY_PREFIX)) {
      industries.add(finding.checkId.slice(INDUSTRY_PREFIX.length));
    }
  }
  return [...industries];
};

const computeGrade = (weightedScore: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (weightedScore >= GRADE_A_THRESHOLD) return 'A';
  if (weightedScore >= GRADE_B_THRESHOLD) return 'B';
  if (weightedScore >= GRADE_C_THRESHOLD) return 'C';
  if (weightedScore >= GRADE_D_THRESHOLD) return 'D';
  return 'F';
};

interface IssueContext {
  readonly name: string;
  readonly friaCompleted: boolean;
  readonly completenessScore: number;
  readonly evidenceValid: boolean;
  readonly evidenceEntries: number;
  readonly riskClass: string;
  readonly detectedIndustries: readonly string[];
}

const buildIssues = (ctx: IssueContext): readonly string[] => {
  const issues: string[] = [];

  if (!ctx.friaCompleted) {
    issues.push(`FRIA not completed — run \`complior agent fria ${ctx.name}\``);
  }

  if (ctx.completenessScore < COMPLETENESS_WARNING_THRESHOLD) {
    issues.push(`Passport only ${ctx.completenessScore}% complete — run \`complior agent init --force\``);
  }

  if (!ctx.evidenceValid && ctx.evidenceEntries > 0) {
    issues.push('Evidence chain broken — investigate chain.json');
  }

  if (ctx.evidenceEntries === 0) {
    issues.push('No evidence chain entries — run a scan to start collecting evidence');
  }

  const highRiskIndustry = ctx.detectedIndustries.find((ind) => HIGH_RISK_INDUSTRY_IDS.has(ind as import('../../data/industry-patterns.js').IndustryId));
  if (highRiskIndustry && ctx.riskClass !== 'high' && ctx.riskClass !== 'prohibited') {
    issues.push(`High-risk industry detected (${highRiskIndustry}) but risk_class is '${ctx.riskClass}'`);
  }

  return issues;
};

// --- Main function ---

export const computeAgentScore = (input: AgentRegistryInput): AgentRegistryEntry => {
  const { passport, completeness, scanResult, evidenceSummary } = input;

  const riskClass = passport.compliance.eu_ai_act.risk_class;
  const complianceScore = scanResult?.score.totalScore ?? 0;
  const friaCompleted = passport.compliance.fria_completed === true;
  const evidenceValid = evidenceSummary.chainValid;
  const evidenceEntries = evidenceSummary.totalEntries;
  const detectedIndustries = extractIndustries(scanResult);

  const friaBonus = friaCompleted ? BONUS_FRIA : 0;
  const evidenceBonus = evidenceValid && evidenceEntries > 0 ? BONUS_EVIDENCE : 0;
  const weightedScore =
    complianceScore * WEIGHT_COMPLIANCE +
    completeness.score * WEIGHT_COMPLETENESS +
    friaBonus +
    evidenceBonus;

  const grade = computeGrade(weightedScore);

  const issues = buildIssues({
    name: passport.name,
    friaCompleted,
    completenessScore: completeness.score,
    evidenceValid,
    evidenceEntries,
    riskClass,
    detectedIndustries,
  });

  return {
    name: passport.name,
    displayName: passport.display_name,
    agentId: passport.agent_id,
    riskClass,
    autonomyLevel: passport.autonomy_level,
    framework: passport.framework,
    passportCompleteness: completeness.score,
    complianceScore,
    friaStatus: friaCompleted ? 'completed' : 'pending',
    evidenceChain: {
      entries: evidenceEntries,
      valid: evidenceValid,
    },
    detectedIndustries,
    grade,
    issues,
  };
};
