/**
 * ISO 42001 Risk Register Generator.
 *
 * Deterministic document generator — no LLM required.
 * Maps scan findings (type='fail') to risk entries with likelihood/impact/score.
 */
import type { AgentPassport } from '../../types/passport.types.js';
import type {
  ScanResult,
  Finding,
  Severity,
  RiskLikelihood,
  RiskImpact,
  RiskTreatment,
  RiskRegisterEntry,
  RiskRegisterResult,
} from '../../types/common.types.js';

// --- Types ---

export interface RiskRegisterInput {
  readonly manifest: AgentPassport;
  readonly scanResult: ScanResult;
  readonly organization?: string;
}

// --- Severity Mapping ---

interface RiskMapping {
  readonly likelihood: RiskLikelihood;
  readonly likelihoodScore: number;
  readonly impact: RiskImpact;
  readonly impactScore: number;
}

const SEVERITY_RISK_MAP: Readonly<Record<string, RiskMapping>> = {
  critical: { likelihood: 'likely', likelihoodScore: 4, impact: 'severe', impactScore: 5 },
  high: { likelihood: 'possible', likelihoodScore: 3, impact: 'major', impactScore: 4 },
  medium: { likelihood: 'unlikely', likelihoodScore: 2, impact: 'moderate', impactScore: 3 },
  low: { likelihood: 'rare', likelihoodScore: 1, impact: 'minor', impactScore: 2 },
};

// Default for unknown/info severity
const DEFAULT_RISK_MAP: RiskMapping = {
  likelihood: 'rare',
  likelihoodScore: 1,
  impact: 'negligible',
  impactScore: 1,
};

// --- Helpers ---

const generateRiskId = (index: number): string => {
  const year = new Date().getFullYear();
  const seq = String(index + 1).padStart(3, '0');
  return `RISK-${year}-${seq}`;
};

const determineTreatment = (finding: Finding): { treatment: RiskTreatment; mitigation: string } => {
  if (finding.fix) {
    return { treatment: 'mitigate', mitigation: finding.fix };
  }
  return { treatment: 'accept', mitigation: 'Manual remediation required' };
};

/** Calculate deadline based on severity (offset from EU AI Act enforcement). */
const calculateDeadline = (severity: Severity): string => {
  const enforcement = new Date('2026-08-02');
  const offsets: Record<string, number> = {
    critical: 30,   // 1 month before enforcement
    high: 60,       // 2 months before
    medium: 90,     // 3 months before
    low: 120,       // 4 months before
  };
  const offsetDays = offsets[severity] ?? 90;
  const deadline = new Date(enforcement.getTime() - offsetDays * 24 * 60 * 60 * 1000);
  return deadline.toISOString().slice(0, 10);
};

/** Render risk register markdown. */
const renderMarkdown = (
  manifest: AgentPassport,
  entries: readonly RiskRegisterEntry[],
  organization: string,
  stats: { totalRisks: number; criticalCount: number; highCount: number; averageRiskScore: number },
): string => {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  const docId = `ISOREG-${year}-${seq}`;

  const riskClass = manifest.compliance?.eu_ai_act?.risk_class ?? '';

  // Count by risk level bands
  const mediumCount = entries.filter((e) => e.riskScore >= 5 && e.riskScore <= 9).length;
  const lowCount = entries.filter((e) => e.riskScore >= 1 && e.riskScore <= 4).length;

  // Build table rows
  const tableRows = entries.map((e) =>
    `| ${e.riskId} | ${e.description} | ${e.source} | ${e.severity} | ${e.likelihood} | ${e.impact} | ${e.riskScore} | ${e.treatment} | ${e.mitigation} | ${e.owner} | ${e.deadline} | ${e.status} |`,
  ).join('\n');

  return `# Risk Register

**Document ID:** ${docId}
**Organization:** ${organization}
**AI System:** ${manifest.display_name}
**Date:** ${today}
**Version:** ${manifest.version}
**Risk Class:** ${riskClass}
**Standard:** ISO/IEC 42001:2023 Clause 6.1.2

---

## 1. Purpose

This Risk Register documents identified risks for ${manifest.display_name}, their assessment (likelihood x impact), treatment decisions, and mitigation plans. Risks are derived from automated compliance scanning and manual assessment.

## 2. Risk Assessment Methodology

### 2.1 Likelihood Scale

| Level | Score | Description |
|-------|-------|-------------|
| Rare | 1 | May occur only in exceptional circumstances |
| Unlikely | 2 | Could occur but not expected |
| Possible | 3 | Might occur at some time |
| Likely | 4 | Will probably occur |
| Almost Certain | 5 | Expected to occur in most circumstances |

### 2.2 Impact Scale

| Level | Score | Description |
|-------|-------|-------------|
| Negligible | 1 | Insignificant impact on operations or rights |
| Minor | 2 | Minor impact, easily remediated |
| Moderate | 3 | Noticeable impact requiring action |
| Major | 4 | Significant impact on rights or operations |
| Severe | 5 | Catastrophic impact, regulatory action likely |

### 2.3 Risk Score Matrix

Risk Score = Likelihood x Impact (1-25)

---

## 3. Risk Register

| Risk ID | Description | Source | Severity | Likelihood | Impact | Score | Treatment | Mitigation | Owner | Deadline | Status |
|---------|------------|--------|----------|-----------|--------|-------|-----------|-----------|-------|----------|--------|
${tableRows || '| — | No risks identified | — | — | — | — | — | — | — | — | — | — |'}

---

## 4. Risk Summary

- **Total Risks:** ${stats.totalRisks}
- **Critical (16-25):** ${stats.criticalCount}
- **High (10-15):** ${stats.highCount}
- **Medium (5-9):** ${mediumCount}
- **Low (1-4):** ${lowCount}
- **Average Risk Score:** ${stats.averageRiskScore}

---

## 5. Treatment Plan

${entries.filter((e) => e.treatment === 'mitigate' || e.treatment === 'transfer').map((e) => `- **${e.riskId}** (${e.source}): ${e.mitigation}`).join('\n') || 'No active treatment plans.'}

---

## 6. Review and Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Risk Manager | [Name] | _________ | ${today} |
| AI Governance Lead | [Name] | _________ | ${today} |
| DPO | [Name] | _________ | ${today} |

**Next Review Date:** [Date + review cycle]

---

*Generated by Complior v${manifest.version} | ISO/IEC 42001:2023 Clause 6.1.2*`;
};

// --- Generator ---

export const generateRiskRegister = (input: RiskRegisterInput): RiskRegisterResult => {
  const { manifest, scanResult, organization } = input;
  const orgName = organization ?? manifest.owner?.team ?? '[Organization]';

  // Only fail findings become risk entries
  const failFindings = scanResult.findings.filter((f) => f.type === 'fail');

  const owner = manifest.oversight?.responsible_person ?? '[Unassigned]';

  // Map findings to risk entries
  const entries: RiskRegisterEntry[] = failFindings.map((finding, index) => {
    const riskMap = SEVERITY_RISK_MAP[finding.severity] ?? DEFAULT_RISK_MAP;
    const riskScore = riskMap.likelihoodScore * riskMap.impactScore;
    const { treatment, mitigation } = determineTreatment(finding);

    return {
      riskId: generateRiskId(index),
      description: finding.message,
      source: finding.checkId,
      severity: finding.severity as Severity,
      likelihood: riskMap.likelihood,
      impact: riskMap.impact,
      riskScore,
      treatment,
      mitigation,
      owner,
      deadline: calculateDeadline(finding.severity as Severity),
      status: 'open' as const,
    };
  });

  // Sort by riskScore descending
  entries.sort((a, b) => b.riskScore - a.riskScore);

  // Re-assign riskIds after sorting to keep sequential order
  const sortedEntries: RiskRegisterEntry[] = entries.map((entry, index) => ({
    ...entry,
    riskId: generateRiskId(index),
  }));

  // Summary stats
  const totalRisks = sortedEntries.length;
  const criticalCount = sortedEntries.filter((e) => e.riskScore >= 16).length;
  const highCount = sortedEntries.filter((e) => e.riskScore >= 10 && e.riskScore <= 15).length;
  const averageRiskScore = totalRisks > 0
    ? Math.round(sortedEntries.reduce((sum, e) => sum + e.riskScore, 0) / totalRisks)
    : 0;

  const markdown = renderMarkdown(manifest, sortedEntries, orgName, {
    totalRisks,
    criticalCount,
    highCount,
    averageRiskScore,
  });

  return Object.freeze({
    markdown,
    entries: Object.freeze(sortedEntries.map((e) => Object.freeze(e))),
    totalRisks,
    criticalCount,
    highCount,
    averageRiskScore,
  });
};
