import type { Finding } from '../../types/common.types.js';
import type { PriorityActionPlan, PriorityAction, ActionSource, DocumentInventory, ObligationCoverage, PassportStatusSection } from './types.js';

const MAX_ACTIONS = 20;

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4.0,
  high: 3.0,
  medium: 2.0,
  low: 1.0,
  info: 0.5,
};

const urgencyMultiplier = (daysLeft: number | null): number => {
  if (daysLeft === null) return 1.0;
  if (daysLeft <= 30) return 3.0;
  if (daysLeft <= 60) return 2.0;
  if (daysLeft <= 90) return 1.5;
  return 1.0;
};

const calcPriority = (severity: string, daysLeft: number | null, scoreImpact: number): number => {
  const sw = SEVERITY_WEIGHT[severity] ?? 1.0;
  const um = urgencyMultiplier(daysLeft);
  const si = Math.max(scoreImpact / 10, 0.1);
  return sw * um * si;
};

const daysUntil = (deadline: string | null): number | null => {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

/** Collect actions from scan fail findings. */
const fromScanFindings = (findings: readonly Finding[]): Omit<PriorityAction, 'rank'>[] =>
  findings
    .filter((f) => f.type === 'fail')
    .map((f) => {
      const dl = f.articleReference?.includes('Art.') ? '2026-08-02' : null;
      const days = daysUntil(dl);
      return {
        source: 'scan' as ActionSource,
        id: f.checkId,
        title: f.fix ?? f.message,
        article: f.articleReference ?? '',
        severity: f.severity,
        deadline: dl,
        daysLeft: days,
        scoreImpact: f.priority ?? 5,
        fixAvailable: !!f.fixDiff || !!f.fix,
        command: 'complior fix',
        priorityScore: calcPriority(f.severity, days, f.priority ?? 5),
      };
    });

/** Collect actions from missing or scaffold documents. */
const fromDocuments = (docs: DocumentInventory): Omit<PriorityAction, 'rank'>[] =>
  docs.documents
    .filter((d) => d.status === 'missing' || d.status === 'scaffold')
    .map((d) => {
      const days = daysUntil('2026-08-02');
      const isMissing = d.status === 'missing';
      return {
        source: 'document' as ActionSource,
        id: d.docType,
        title: isMissing
          ? `Create ${d.description} (${d.article})`
          : `Fill scaffold ${d.description} (${d.article})`,
        article: d.article,
        severity: isMissing ? 'high' : 'medium',
        deadline: '2026-08-02',
        daysLeft: days,
        scoreImpact: d.scoreImpact,
        fixAvailable: isMissing,
        command: isMissing ? 'complior fix' : 'manual edit',
        priorityScore: calcPriority(isMissing ? 'high' : 'medium', days, d.scoreImpact),
      };
    });

/** Collect actions from uncovered critical obligations. */
const fromObligations = (coverage: ObligationCoverage): Omit<PriorityAction, 'rank'>[] =>
  coverage.critical
    .filter((o) => o.linkedChecks.length === 0) // no scanner check exists — manual only
    .map((o) => {
      const days = daysUntil(o.deadline);
      return {
        source: 'obligation' as ActionSource,
        id: o.id,
        title: o.title,
        article: o.article,
        severity: o.severity,
        deadline: o.deadline,
        daysLeft: days,
        scoreImpact: 0,
        fixAvailable: false,
        command: 'manual review',
        priorityScore: calcPriority(o.severity, days, 5),
      };
    });

/** Collect actions from incomplete passports. */
const fromPassports = (passports: PassportStatusSection): Omit<PriorityAction, 'rank'>[] =>
  passports.passports
    .filter((p) => p.completeness < 80)
    .map((p) => {
      const days = daysUntil('2026-08-02');
      return {
        source: 'passport' as ActionSource,
        id: p.name,
        title: `Complete passport for ${p.name} (${p.completeness}% → 100%)`,
        article: 'Art. 49',
        severity: p.completeness < 50 ? 'high' : 'medium',
        deadline: '2026-08-02',
        daysLeft: days,
        scoreImpact: 0,
        fixAvailable: false,
        command: `complior agent init`,
        priorityScore: calcPriority(p.completeness < 50 ? 'high' : 'medium', days, 5),
      };
    });

export const buildPriorityActions = (
  findings: readonly Finding[],
  documents: DocumentInventory,
  obligations: ObligationCoverage,
  passports: PassportStatusSection,
): PriorityActionPlan => {
  const all = [
    ...fromScanFindings(findings),
    ...fromDocuments(documents),
    ...fromObligations(obligations),
    ...fromPassports(passports),
  ];

  // Deduplicate: scan findings may overlap with document actions (same checkId/docType)
  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    const key = `${a.source}:${a.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Ensure source diversity: reserve up to 3 slots per non-dominant source
  // so scan, document, and passport actions appear even when obligations dominate.
  const sorted = deduped.sort((a, b) => b.priorityScore - a.priorityScore);

  const result: Omit<PriorityAction, 'rank'>[] = [];
  const usedKeys = new Set<string>();

  // Phase 1: top action from each source (guaranteed representation)
  for (const source of ['scan', 'document', 'passport', 'obligation'] as const) {
    const top = sorted.find((a) => a.source === source && !usedKeys.has(`${a.source}:${a.id}`));
    if (top) {
      result.push(top);
      usedKeys.add(`${top.source}:${top.id}`);
    }
  }

  // Phase 2: fill remaining slots by global priority
  for (const a of sorted) {
    if (result.length >= MAX_ACTIONS) break;
    const key = `${a.source}:${a.id}`;
    if (!usedKeys.has(key)) {
      result.push(a);
      usedKeys.add(key);
    }
  }

  // Re-sort by priority and assign ranks
  const ranked = result
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  return {
    actions: ranked,
    totalActions: deduped.length,
    shownActions: ranked.length,
  };
};
