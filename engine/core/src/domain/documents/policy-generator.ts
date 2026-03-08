import type { AgentPassport } from '../../types/passport.types.js';
import type { IndustryId } from '../../data/industry-patterns.js';
import { deriveOversightDescription } from './passport-helpers.js';

// --- Types ---

export interface PolicyGeneratorInput {
  readonly manifest: AgentPassport;
  readonly template: string;
  readonly industry: IndustryId;
  readonly organization?: string;
  readonly approver?: string;
}

export interface PolicyResult {
  readonly markdown: string;
  readonly industry: IndustryId;
  readonly prefilledFields: readonly string[];
  readonly manualFields: readonly string[];
}

// --- Generator ---

export const generatePolicy = (input: PolicyGeneratorInput): PolicyResult => {
  const { manifest, template, industry, organization, approver } = input;
  const prefilledFields: string[] = [];
  const manualFields: string[] = [];

  let markdown = template;
  const today = new Date().toISOString().split('T')[0]!;

  // 1. Document Header table fields
  markdown = markdown.replaceAll('[AI System Name]', manifest.display_name);
  prefilledFields.push('AI System Name');

  markdown = markdown.replaceAll('[Date]', today);
  prefilledFields.push('Date');

  markdown = markdown.replaceAll('[Version]', manifest.version);
  prefilledFields.push('Version');

  const orgName = organization ?? manifest.owner.team;
  if (orgName) {
    markdown = markdown.replaceAll('[Organization]', orgName);
    prefilledFields.push('Organization');
  } else {
    manualFields.push('Organization');
  }

  const riskClass = manifest.compliance?.eu_ai_act?.risk_class ?? '';
  if (riskClass) {
    markdown = markdown.replaceAll('[Risk Class]', riskClass);
    prefilledFields.push('Risk Class');
  } else {
    manualFields.push('Risk Class');
  }

  // 2. AI System Description section
  markdown = markdown.replaceAll('[Description]', manifest.description);
  prefilledFields.push('Description');

  markdown = markdown.replaceAll('[Provider]', manifest.model.provider);
  prefilledFields.push('Provider');

  markdown = markdown.replaceAll('[Model ID]', manifest.model.model_id);
  prefilledFields.push('Model ID');

  markdown = markdown.replaceAll('[Autonomy Level]', manifest.autonomy_level);
  prefilledFields.push('Autonomy Level');

  // 3. Human Oversight description
  const oversightDesc = deriveOversightDescription(manifest);
  markdown = markdown.replaceAll('[Human Oversight Description]', oversightDesc);
  prefilledFields.push('Human Oversight Description');

  // 4. Approver
  if (approver) {
    markdown = markdown.replaceAll('[Approver Name]', approver);
    prefilledFields.push('Approver');
  } else {
    manualFields.push('Approver Name');
  }

  // 5. Common manual fields (present in all templates)
  manualFields.push('DPO sign-off');
  manualFields.push('Additional role sign-offs');

  return Object.freeze({
    markdown,
    industry,
    prefilledFields: Object.freeze([...prefilledFields]),
    manualFields: Object.freeze([...manualFields]),
  });
};
