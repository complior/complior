import type { AgentManifest } from '../../types/passport.types.js';

// --- Types ---

export interface FriaGeneratorInput {
  readonly manifest: AgentManifest;
  readonly template: string;
  readonly organization?: string;
  readonly assessor?: string;
}

export interface FriaResult {
  readonly markdown: string;
  readonly prefilledFields: readonly string[];
  readonly manualFields: readonly string[];
}

// --- Helpers ---

const generateFriaId = (): string => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `FRIA-${year}-${seq}`;
};

const deriveRiskLevel = (riskClass: string): string => {
  switch (riskClass) {
    case 'prohibited': return 'H';
    case 'high': return 'H';
    case 'limited': return 'M';
    case 'minimal': return 'L';
    default: return '[H/M/L/N]';
  }
};

const deriveOversightDescription = (manifest: AgentManifest): string => {
  const parts: string[] = [];
  const level = manifest.autonomy_level;

  if (level === 'L1' || level === 'L2') {
    parts.push('System operates under direct human supervision.');
  } else if (level === 'L3') {
    parts.push('System operates semi-autonomously with human oversight checkpoints.');
  } else {
    parts.push('System operates autonomously; enhanced oversight measures required.');
  }

  if (manifest.constraints.human_approval_required.length > 0) {
    parts.push(`Human approval required for: ${manifest.constraints.human_approval_required.join(', ')}.`);
  }

  if (manifest.autonomy_evidence.human_approval_gates > 0) {
    parts.push(`${manifest.autonomy_evidence.human_approval_gates} human approval gate(s) detected in code.`);
  }

  return parts.join(' ');
};

// --- Generator ---

export const generateFria = (input: FriaGeneratorInput): FriaResult => {
  const { manifest, template, organization, assessor } = input;
  const prefilledFields: string[] = [];
  const manualFields: string[] = [];

  let markdown = template;

  // 1. Assessment Header
  // [AI System Name]
  markdown = markdown.replaceAll('[AI System Name]', manifest.display_name);
  prefilledFields.push('AI System Name');

  // FRIA-[YYYY]-[NNN]
  const friaId = generateFriaId();
  markdown = markdown.replace('FRIA-[YYYY]-[NNN]', friaId);
  prefilledFields.push('Assessment ID');

  // [Date] in header
  const today = new Date().toISOString().split('T')[0]!;
  markdown = markdown.replaceAll('[Date]', today);
  prefilledFields.push('Date');

  // Assessor
  if (assessor) {
    markdown = markdown.replace('[Name, Title]', assessor);
    prefilledFields.push('Assessor');
  } else {
    manualFields.push('Assessor (Name, Title)');
  }

  // DPO
  manualFields.push('DPO Consulted (Name, Date)');

  // 2. AI System Description
  // System name in section 2
  markdown = markdown.replace('System name: [Name]', `System name: ${manifest.display_name}`);

  // Provider
  markdown = markdown.replace('Provider: [Name]', `Provider: ${manifest.model.provider}`);
  prefilledFields.push('Provider');

  // Version
  markdown = markdown.replace('Version: [Number]', `Version: ${manifest.version}`);
  prefilledFields.push('Version');

  // Intended purpose
  markdown = markdown.replace('Intended purpose: [Description]', `Intended purpose: ${manifest.description}`);
  prefilledFields.push('Intended purpose');

  // Deployment context, categories, geographic scope — manual
  manualFields.push('Deployment context');
  manualFields.push('Categories of persons affected');
  manualFields.push('Geographic scope');

  // 3. Deployer Information
  const orgName = organization ?? manifest.owner.team;
  if (orgName) {
    markdown = markdown.replace('Organisation: [Name]', `Organisation: ${orgName}`);
    prefilledFields.push('Organisation');
  } else {
    manualFields.push('Organisation');
  }
  manualFields.push('Organisation type');
  manualFields.push('Article 27 trigger');

  // 4. Risk Assessment table — set default risk level from passport
  const riskLevel = deriveRiskLevel(manifest.compliance.eu_ai_act.risk_class);
  // Replace first occurrence of [H/M/L/N] as a default hint, but leave others for manual review
  manualFields.push('Fundamental Rights risk descriptions');
  manualFields.push('Affected groups');
  manualFields.push('Mitigation measures');

  // Pre-fill first risk row level if we know the risk class
  if (riskLevel !== '[H/M/L/N]') {
    // Replace only in the table rows (after the header)
    const tableRows = markdown.split('\n');
    let replaced = false;
    for (let i = 0; i < tableRows.length; i++) {
      if (tableRows[i]!.includes('| [H/M/L/N]') && !replaced) {
        tableRows[i] = tableRows[i]!.replace('[H/M/L/N]', riskLevel);
        replaced = true;
        // Only pre-fill first row to hint, rest remain manual
      }
    }
    markdown = tableRows.join('\n');
  }

  // 5. Human Oversight Measures
  const oversightDesc = deriveOversightDescription(manifest);
  markdown = markdown.replace(
    '[Description of how human can intervene/stop the system]',
    oversightDesc,
  );
  prefilledFields.push('Human oversight mechanism');
  manualFields.push('Assigned oversight person');
  manualFields.push('Escalation process');
  manualFields.push('Review frequency');

  // 6-8: Mostly manual
  manualFields.push('Incident response plan');
  manualFields.push('Communication to affected persons');
  manualFields.push('System suspension criteria');
  manualFields.push('Remediation process');
  manualFields.push('Internal complaint mechanism');
  manualFields.push('External complaint options');
  manualFields.push('DPIA reference');
  manualFields.push('Legal basis for data processing');

  // 9. Conclusion — manual
  manualFields.push('Overall risk assessment decision');
  manualFields.push('Conditions for deployment');
  manualFields.push('Next review date');

  // 10. Sign-off — manual
  manualFields.push('Assessor sign-off');
  manualFields.push('DPO sign-off');
  manualFields.push('Decision-maker sign-off');
  manualFields.push('Market surveillance notification');

  return Object.freeze({
    markdown,
    prefilledFields: Object.freeze([...prefilledFields]),
    manualFields: Object.freeze([...manualFields]),
  });
};
