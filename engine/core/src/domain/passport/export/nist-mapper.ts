import { z } from 'zod';
import type { AgentManifest } from '../../../types/passport.types.js';

// --- NIST AI RMF Profile Schema ---

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['not_started', 'in_progress', 'implemented']),
  evidence: z.array(z.string()),
});

const FunctionStatusSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'implemented']),
  categories: z.array(CategorySchema),
  completionPercent: z.number().min(0).max(100),
});

export const NISTProfileSchema = z.object({
  framework: z.literal('NIST-AI-RMF'),
  version: z.literal('1.0'),
  agent: z.object({ name: z.string(), id: z.string(), version: z.string() }),
  functions: z.object({
    govern: FunctionStatusSchema,
    map: FunctionStatusSchema,
    measure: FunctionStatusSchema,
    manage: FunctionStatusSchema,
  }),
  overallMaturity: z.number().min(0).max(100),
  profileDate: z.string(),
});

export type NISTProfile = z.infer<typeof NISTProfileSchema>;

type FunctionStatus = z.infer<typeof FunctionStatusSchema>;

// --- Shared helpers (DRY: status derivation used by all category/function assessors) ---

interface CategoryInput {
  readonly id: string;
  readonly name: string;
  readonly evidence: readonly string[];
}

const deriveCategoryStatus = (evidence: readonly string[]): 'not_started' | 'in_progress' | 'implemented' => {
  if (evidence.length === 0) return 'not_started';
  if (evidence.length >= 2) return 'implemented';
  return 'in_progress';
};

const buildFunction = (inputs: readonly CategoryInput[]): FunctionStatus => {
  const categories = inputs.map(input => ({
    id: input.id,
    name: input.name,
    status: deriveCategoryStatus(input.evidence),
    evidence: [...input.evidence],
  }));

  const implemented = categories.filter(c => c.status === 'implemented').length;
  const hasProgress = categories.some(c => c.status === 'in_progress');

  return {
    status: implemented === categories.length ? 'implemented'
      : (implemented > 0 || hasProgress) ? 'in_progress'
        : 'not_started',
    categories,
    completionPercent: Math.round((implemented / categories.length) * 100),
  };
};

// --- Conditional evidence collector (avoids spread noise) ---

const evidence = (...items: readonly (string | false)[]): string[] =>
  items.filter((item): item is string => item !== false);

// --- Function assessors (pure functions returning category inputs) ---

const governCategories = (m: AgentManifest): readonly CategoryInput[] => [
  {
    id: 'GV-1',
    name: 'Policies & Procedures',
    evidence: evidence(
      m.owner.responsible_person !== '' && `Responsible person: ${m.owner.responsible_person}`,
      m.owner.team !== '' && `Team: ${m.owner.team}`,
      m.owner.contact !== '' && `Contact: ${m.owner.contact}`,
    ),
  },
  {
    id: 'GV-2',
    name: 'Accountability Structures',
    evidence: evidence(
      m.constraints.human_approval_required.length > 0 && `Human approval required for: ${m.constraints.human_approval_required.join(', ')}`,
      m.lifecycle.review_frequency_days > 0 && `Review frequency: ${m.lifecycle.review_frequency_days} days`,
    ),
  },
  {
    id: 'GV-3',
    name: 'Risk Constraints',
    evidence: evidence(
      m.constraints.rate_limits.max_actions_per_minute > 0 && `Rate limit: ${m.constraints.rate_limits.max_actions_per_minute}/min`,
      m.constraints.budget.max_cost_per_session_usd > 0 && `Budget: $${m.constraints.budget.max_cost_per_session_usd}/session`,
      m.constraints.prohibited_actions.length > 0 && `Prohibited actions: ${m.constraints.prohibited_actions.length}`,
    ),
  },
];

const mapCategories = (m: AgentManifest): readonly CategoryInput[] => [
  {
    id: 'MP-1',
    name: 'System Context',
    evidence: evidence(
      `Agent type: ${m.type}`,
      `Autonomy level: ${m.autonomy_level}`,
      m.description !== '' && 'Description provided',
    ),
  },
  {
    id: 'MP-2',
    name: 'AI Model Identification',
    evidence: evidence(
      m.model.provider !== '' && `Provider: ${m.model.provider}`,
      m.model.model_id !== '' && `Model: ${m.model.model_id}`,
      m.model.deployment !== '' && `Deployment: ${m.model.deployment}`,
    ),
  },
  {
    id: 'MP-3',
    name: 'Risk Categorization',
    evidence: evidence(
      `Risk class: ${m.compliance.eu_ai_act.risk_class}`,
      m.compliance.eu_ai_act.applicable_articles.length > 0 && `Applicable articles: ${m.compliance.eu_ai_act.applicable_articles.join(', ')}`,
    ),
  },
  {
    id: 'MP-4',
    name: 'Permissions & Data Access',
    evidence: evidence(
      m.permissions.tools.length > 0 && `Tools: ${m.permissions.tools.join(', ')}`,
      m.permissions.denied.length > 0 && `Denied: ${m.permissions.denied.join(', ')}`,
    ),
  },
];

const measureCategories = (m: AgentManifest): readonly CategoryInput[] => [
  {
    id: 'MS-1',
    name: 'Compliance Scoring',
    evidence: evidence(
      m.compliance.complior_score > 0 && `Complior score: ${m.compliance.complior_score}`,
      m.compliance.last_scan !== '' && `Last scan: ${m.compliance.last_scan}`,
    ),
  },
  {
    id: 'MS-2',
    name: 'Autonomy Assessment',
    evidence: evidence(
      m.autonomy_evidence.human_approval_gates > 0 && `Human approval gates: ${m.autonomy_evidence.human_approval_gates}`,
      m.autonomy_evidence.unsupervised_actions > 0 && `Unsupervised actions tracked: ${m.autonomy_evidence.unsupervised_actions}`,
    ),
  },
  {
    id: 'MS-3',
    name: 'Transparency & Disclosure',
    evidence: evidence(
      m.disclosure.user_facing && 'User-facing disclosure enabled',
      m.disclosure.ai_marking.responses_marked && `AI marking: ${m.disclosure.ai_marking.method}`,
    ),
  },
];

const manageCategories = (m: AgentManifest): readonly CategoryInput[] => [
  {
    id: 'MG-1',
    name: 'Lifecycle Management',
    evidence: evidence(
      `Status: ${m.lifecycle.status}`,
      m.lifecycle.deployed_since !== '' && `Deployed since: ${m.lifecycle.deployed_since}`,
      m.lifecycle.next_review !== '' && `Next review: ${m.lifecycle.next_review}`,
    ),
  },
  {
    id: 'MG-2',
    name: 'Monitoring & Logging',
    evidence: evidence(
      m.logging.actions_logged && 'Actions logged',
      m.logging.retention_days > 0 && `Retention: ${m.logging.retention_days} days`,
      m.logging.includes_decision_rationale && 'Decision rationale included',
    ),
  },
  {
    id: 'MG-3',
    name: 'Impact Assessment',
    evidence: evidence(
      m.compliance.fria_completed === true && 'FRIA completed',
      m.compliance.worker_notification_sent === true && 'Worker notification sent',
    ),
  },
];

// --- Main export function ---

export const mapToNIST = (manifest: AgentManifest): NISTProfile => {
  const functions = {
    govern: buildFunction(governCategories(manifest)),
    map: buildFunction(mapCategories(manifest)),
    measure: buildFunction(measureCategories(manifest)),
    manage: buildFunction(manageCategories(manifest)),
  };

  const allCompletions = Object.values(functions).map(f => f.completionPercent);
  const overallMaturity = Math.round(
    allCompletions.reduce((sum, c) => sum + c, 0) / allCompletions.length,
  );

  return {
    framework: 'NIST-AI-RMF' as const,
    version: '1.0' as const,
    agent: {
      name: manifest.display_name,
      id: manifest.agent_id,
      version: manifest.version,
    },
    functions,
    overallMaturity,
    profileDate: new Date().toISOString(),
  };
};
