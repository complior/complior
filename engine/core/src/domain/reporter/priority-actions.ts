import type { Finding } from '../../types/common.types.js';
import type { PriorityActionPlan, PriorityAction, ActionSource, DocumentInventory, ObligationCoverage, PassportStatusSection } from './types.js';
import { EU_AI_ACT_DEADLINE_ISO } from '../shared/compliance-constants.js';
import reporterConfig from '../../../data/reporter-config.json' with { type: 'json' };
import { simulateActions } from '../whatif/simulate-actions.js';

const DEADLINE = EU_AI_ACT_DEADLINE_ISO;

const MAX_ACTIONS = reporterConfig.priorityActions.maxActions;
const SEVERITY_WEIGHT: Record<string, number> = reporterConfig.priorityActions.severityWeight;
const URGENCY_TIERS = reporterConfig.priorityActions.urgencyMultiplier;

const urgencyMultiplier = (daysLeft: number | null): number => {
  if (daysLeft === null) return 1.0;
  for (const tier of URGENCY_TIERS) {
    if (daysLeft <= tier.daysThreshold) return tier.multiplier;
  }
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

/** Effort estimate (human-readable) per action source. */
const EFFORT_ESTIMATE: Record<ActionSource, string> = {
  scan: '10 min',
  document: '30 min',
  obligation: '1 hour',
  passport: '15 min',
  eval: '1 hour',
};

/** Collect actions from scan fail findings. */
const fromScanFindings = (findings: readonly Finding[]): Omit<PriorityAction, 'rank' | 'effort' | 'projectedScore'>[] =>
  findings
    .filter((f) => f.type === 'fail')
    .map((f) => {
      const dl = f.articleReference?.includes('Art.') ? DEADLINE : null;
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
const fromDocuments = (docs: DocumentInventory): Omit<PriorityAction, 'rank' | 'effort' | 'projectedScore'>[] =>
  docs.documents
    .filter((d) => d.status === 'missing' || d.status === 'scaffold')
    .map((d) => {
      const days = daysUntil(DEADLINE);
      const isMissing = d.status === 'missing';
      return {
        source: 'document' as ActionSource,
        id: d.docType,
        title: isMissing
          ? `Create ${d.description} (${d.article})`
          : `Fill scaffold ${d.description} (${d.article})`,
        article: d.article,
        severity: isMissing ? 'high' : 'medium',
        deadline: DEADLINE,
        daysLeft: days,
        scoreImpact: d.scoreImpact,
        fixAvailable: isMissing,
        command: isMissing ? 'complior fix' : 'manual edit',
        priorityScore: calcPriority(isMissing ? 'high' : 'medium', days, d.scoreImpact),
      };
    });

/** Collect actions from uncovered critical obligations. */
const fromObligations = (coverage: ObligationCoverage): Omit<PriorityAction, 'rank' | 'effort' | 'projectedScore'>[] =>
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
const fromPassports = (passports: PassportStatusSection): Omit<PriorityAction, 'rank' | 'effort' | 'projectedScore'>[] =>
  passports.passports
    .filter((p) => p.completeness < 80)
    .map((p) => {
      const days = daysUntil(DEADLINE);
      return {
        source: 'passport' as ActionSource,
        id: p.name,
        title: `Complete passport for ${p.name} (${p.completeness}% → 100%)`,
        article: 'Art. 49',
        severity: p.completeness < 50 ? 'high' : 'medium',
        deadline: DEADLINE,
        daysLeft: days,
        scoreImpact: 0,
        fixAvailable: false,
        command: `complior passport init`,
        priorityScore: calcPriority(p.completeness < 50 ? 'high' : 'medium', days, 5),
      };
    });

const EVAL_LOW_THRESHOLD = reporterConfig.priorityActions.evalLowThreshold;

/** Collect actions when eval score is low. */
const fromEvalFindings = (evalScore: number | null): Omit<PriorityAction, 'rank' | 'effort' | 'projectedScore'>[] => {
  if (evalScore === null || evalScore >= EVAL_LOW_THRESHOLD) return [];
  const days = daysUntil(DEADLINE);
  return [{
    source: 'eval' as ActionSource,
    id: 'eval-low-score',
    title: `Improve eval score (${evalScore}/100 → run complior eval to identify gaps)`,
    article: '',
    severity: evalScore < 30 ? 'high' : 'medium',
    deadline: DEADLINE,
    daysLeft: days,
    scoreImpact: 10,
    fixAvailable: false,
    command: 'complior eval',
    priorityScore: calcPriority(evalScore < 30 ? 'high' : 'medium', days, 10),
  }];
};

/** Compute projectedScore for an action by simulating a single fix/add-doc/complete-passport. */
const computeProjectedScore = (
  action: Omit<PriorityAction, 'rank' | 'effort' | 'projectedScore'>,
  currentScore: number,
  findings: readonly Finding[],
  passportCompleteness: number,
): number => {
  let simAction: { type: 'fix' | 'add-doc' | 'complete-passport'; target: string } | null = null;

  if (action.source === 'scan') {
    simAction = { type: 'fix', target: action.id };
  } else if (action.source === 'document') {
    simAction = { type: 'add-doc', target: action.id };
  } else if (action.source === 'passport') {
    simAction = { type: 'complete-passport', target: action.id };
  }

  if (!simAction) return currentScore;

  const simulation = simulateActions({
    actions: [simAction],
    currentScore,
    findings: findings.map((f) => ({ checkId: f.checkId, severity: f.severity, status: f.type })),
    passportCompleteness,
  });

  return simulation.projectedScore;
};

export const buildPriorityActions = (
  findings: readonly Finding[],
  documents: DocumentInventory,
  obligations: ObligationCoverage,
  passports: PassportStatusSection,
  evalScore?: number | null,
  maxOverride?: number | null,
): PriorityActionPlan => {
  const all = [
    ...fromScanFindings(findings),
    ...fromDocuments(documents),
    ...fromObligations(obligations),
    ...fromPassports(passports),
    ...fromEvalFindings(evalScore ?? null),
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

  const effectiveLimit = maxOverride ?? MAX_ACTIONS;
  const result: Omit<PriorityAction, 'rank'>[] = [];
  const usedKeys = new Set<string>();

  // Phase 1: top action from each source (guaranteed representation)
  for (const source of ['scan', 'document', 'passport', 'obligation', 'eval'] as const) {
    const top = sorted.find((a) => a.source === source && !usedKeys.has(`${a.source}:${a.id}`));
    if (top) {
      result.push(top);
      usedKeys.add(`${top.source}:${top.id}`);
    }
  }

  // Phase 2: fill remaining slots by global priority
  for (const a of sorted) {
    if (result.length >= effectiveLimit) break;
    const key = `${a.source}:${a.id}`;
    if (!usedKeys.has(key)) {
      result.push(a);
      usedKeys.add(key);
    }
  }

  // Compute current score for projectedScore (average of passport completeness as proxy)
  const currentScore = Math.round(passports.averageCompleteness) || 50;
  const passportCompleteness = passports.averageCompleteness;

  // Re-sort by priority and assign ranks + effort + projectedScore
  const ranked = result
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((a, i) => ({
      ...a,
      rank: i + 1,
      effort: EFFORT_ESTIMATE[a.source],
      projectedScore: computeProjectedScore(a, currentScore, findings, passportCompleteness),
    }));

  return {
    actions: ranked,
    totalActions: deduped.length,
    shownActions: ranked.length,
  };
};
