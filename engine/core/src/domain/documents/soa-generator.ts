/**
 * ISO 42001 Statement of Applicability (SoA) Generator.
 *
 * Deterministic document generator — no LLM required.
 * Maps ISO 42001 Annex A controls to scan findings → applicability + status.
 */
import type { AgentPassport } from '../../types/passport.types.js';
import type {
  ScanResult,
  Finding,
  Iso42001Control,
  SoAEntry,
  SoAResult,
  SoAApplicability,
  SoAStatus,
} from '../../types/common.types.js';

// --- Types ---

export interface SoAGeneratorInput {
  readonly manifest: AgentPassport;
  readonly scanResult: ScanResult;
  readonly controls: readonly Iso42001Control[];
  readonly organization?: string;
}

// --- Helpers ---

/**
 * Determine the status of a control based on scan findings.
 *
 * - implemented: ALL checkIds have at least one 'pass' finding
 * - planned: SOME checkIds have findings (pass or fail), but not all are pass
 * - not-started: NO checkIds have any findings at all
 */
const determineStatus = (
  checkIds: readonly string[],
  findingsByCheckId: ReadonlyMap<string, readonly Finding[]>,
): { status: SoAStatus; evidence: readonly string[]; gaps: readonly string[] } => {
  const evidence: string[] = [];
  const gaps: string[] = [];

  for (const checkId of checkIds) {
    const findings = findingsByCheckId.get(checkId);
    if (findings && findings.length > 0) {
      evidence.push(checkId);
    } else {
      gaps.push(checkId);
    }
  }

  if (evidence.length === 0) {
    return { status: 'not-started', evidence, gaps };
  }

  // Check if ALL checkIds have at least one 'pass' finding
  const allPass = checkIds.every((checkId) => {
    const findings = findingsByCheckId.get(checkId);
    return findings !== undefined && findings.some((f) => f.type === 'pass');
  });

  if (allPass) {
    return { status: 'implemented', evidence, gaps };
  }

  return { status: 'planned', evidence, gaps };
};

/** Build a lookup map: checkId -> findings */
const buildFindingsMap = (findings: readonly Finding[]): ReadonlyMap<string, readonly Finding[]> => {
  const map = new Map<string, Finding[]>();
  for (const finding of findings) {
    const existing = map.get(finding.checkId);
    if (existing) {
      existing.push(finding);
    } else {
      map.set(finding.checkId, [finding]);
    }
  }
  return map;
};

/** Render SoA markdown from template placeholders and entries. */
const renderMarkdown = (
  manifest: AgentPassport,
  entries: readonly SoAEntry[],
  completeness: number,
  organization: string,
): string => {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  const docId = `ISOSOA-${year}-${seq}`;

  const applicableCount = entries.filter((e) => e.applicable === 'applicable').length;
  const notApplicableCount = entries.filter((e) => e.applicable === 'not-applicable').length;
  const implementedCount = entries.filter((e) => e.status === 'implemented' && e.applicable === 'applicable').length;
  const plannedCount = entries.filter((e) => e.status === 'planned' && e.applicable === 'applicable').length;
  const notStartedCount = entries.filter((e) => e.status === 'not-started' && e.applicable === 'applicable').length;

  // Build table rows
  const tableRows = entries.map((e) =>
    `| ${e.controlId} | ${e.title} | ${e.applicable} | ${e.status} | ${e.evidence.join(', ') || '—'} | ${e.gaps.join(', ') || '—'} |`,
  ).join('\n');

  const riskClass = manifest.compliance?.eu_ai_act?.risk_class ?? '';
  const provider = manifest.model?.provider ?? '';
  const modelId = manifest.model?.model_id ?? '';

  return `# Statement of Applicability (SoA)

**Document ID:** ${docId}
**Organization:** ${organization}
**AI System:** ${manifest.display_name}
**Date:** ${today}
**Version:** ${manifest.version}
**Risk Class:** ${riskClass}
**Standard:** ISO/IEC 42001:2023

---

## 1. Purpose

This Statement of Applicability documents the applicability of ISO/IEC 42001:2023 Annex A controls to ${manifest.display_name}. Each control is assessed for applicability, implementation status, and supporting evidence from automated compliance scanning.

## 2. Scope

- **AI System:** ${manifest.display_name} (${manifest.description})
- **Risk Classification:** ${riskClass} per EU AI Act
- **Autonomy Level:** ${manifest.autonomy_level}
- **Model:** ${modelId} by ${provider}

---

## 3. Controls Assessment

| Control | Title | Applicable | Status | Evidence | Gaps |
|---------|-------|-----------|--------|----------|------|
${tableRows}

---

## 4. Summary

- **Total Controls:** ${entries.length}
- **Applicable:** ${applicableCount}
- **Not Applicable:** ${notApplicableCount}
- **Implemented:** ${implementedCount}
- **Planned:** ${plannedCount}
- **Not Started:** ${notStartedCount}
- **Completeness:** ${completeness}%

---

## 5. Justification for Non-Applicable Controls

${entries.filter((e) => e.applicable === 'not-applicable').map((e) => `- **${e.controlId}** (${e.title}): ${e.justification}`).join('\n') || 'All controls are applicable.'}

---

## 6. Review and Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Compliance Officer | [Name] | _________ | ${today} |
| AI Governance Lead | [Name] | _________ | ${today} |
| Auditor | [Name] | _________ | ${today} |

---

*Generated by Complior v${manifest.version} | ISO/IEC 42001:2023 Clause 6.1.3*`;
};

// --- Generator ---

export const generateSoA = (input: SoAGeneratorInput): SoAResult => {
  const { manifest, scanResult, controls, organization } = input;
  const orgName = organization ?? manifest.owner?.team ?? '[Organization]';
  const findingsMap = buildFindingsMap(scanResult.findings);

  const entries: SoAEntry[] = controls.map((control) => {
    const { status, evidence, gaps } = determineStatus(control.checkIds, findingsMap);

    // All controls are applicable by default (can be extended with risk-class logic)
    const applicable: SoAApplicability = 'applicable';
    const justification = applicable === 'applicable'
      ? `Required for ${manifest.compliance?.eu_ai_act?.risk_class ?? 'unknown'}-risk AI systems`
      : 'Not applicable to this system';

    return {
      controlId: control.controlId,
      title: control.title,
      applicable,
      justification,
      status,
      evidence,
      gaps,
    };
  });

  const applicableEntries = entries.filter((e) => e.applicable === 'applicable');
  const applicableCount = applicableEntries.length;
  const implementedCount = applicableEntries.filter((e) => e.status === 'implemented').length;
  const completeness = applicableCount > 0
    ? Math.round((implementedCount / applicableCount) * 100)
    : 0;

  const markdown = renderMarkdown(manifest, entries, completeness, orgName);

  return Object.freeze({
    markdown,
    entries: Object.freeze(entries.map((e) => Object.freeze(e))),
    completeness,
    applicableCount,
    implementedCount,
  });
};
