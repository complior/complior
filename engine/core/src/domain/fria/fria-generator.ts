import type { AgentManifest } from '../../types/passport.types.js';
import { mapDomain } from '../passport/domain-mapper.js';

// --- Types ---

export interface FriaGeneratorInput {
  readonly manifest: AgentManifest;
  readonly template: string;
  readonly organization?: string;
  readonly assessor?: string;
  readonly impact?: string;
  readonly mitigation?: string;
  readonly approval?: string;
}

export interface FriaResult {
  readonly markdown: string;
  readonly structured: FriaStructuredPayload;
  readonly prefilledFields: readonly string[];
  readonly manualFields: readonly string[];
}

/** Structured FRIA payload — matches SaaS FRIASection schema */
export interface FriaStructuredPayload {
  readonly toolSlug: string;
  readonly assessmentId: string;
  readonly date: string;
  readonly sections: {
    readonly general_info: {
      readonly toolName: string;
      readonly vendor: string;
      readonly purpose: string;
      readonly domain: string;
      readonly riskLevel: string;
      readonly version: string;
      readonly provider: string;
      readonly deploymentContext: string;
      readonly assessorName: string;
      readonly assessorTitle: string;
      readonly geographicScope: string;
      readonly organisation: string;
      readonly organisationType: string;
    };
    readonly affected_persons: {
      readonly categories: readonly string[];
      readonly vulnerableGroups: boolean;
      readonly estimatedCount: string;
      readonly description: string;
    };
    readonly specific_risks: {
      readonly risks: ReadonlyArray<{
        readonly right: string;
        readonly article: string;
        readonly severity: string;
        readonly likelihood: string;
        readonly description: string;
        readonly affectedGroups: string;
        readonly mitigation: string;
      }>;
    };
    readonly human_oversight: {
      readonly hasHumanOversight: boolean;
      readonly oversightType: string;
      readonly mechanism: string;
      readonly responsibleRole: string;
      readonly escalationProcess: string;
      readonly reviewFrequency: string;
    };
    readonly mitigation_measures: {
      readonly measures: ReadonlyArray<{
        readonly risk: string;
        readonly measure: string;
        readonly responsible: string;
        readonly deadline: string;
      }>;
      readonly incidentResponse: string;
      readonly communicationPlan: string;
      readonly suspensionCriteria: string;
      readonly remediationProcess: string;
      readonly internalComplaint: string;
      readonly externalComplaint: string;
    };
    readonly monitoring_plan: {
      readonly frequency: string;
      readonly metrics: readonly string[];
      readonly responsibleTeam: string;
      readonly reviewProcess: string;
      readonly nextReviewDate: string;
      readonly dpiaReference: string;
      readonly legalBasis: string;
      readonly overallRiskDecision: string;
      readonly conditionsForDeployment: string;
    };
  };
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

// --- Charter Rights for FRIA ---

const CHARTER_RIGHTS = [
  { right: 'Non-discrimination', article: 'Art. 21' },
  { right: 'Privacy and data protection', article: 'Arts. 7-8' },
  { right: 'Freedom of expression', article: 'Art. 11' },
  { right: 'Human dignity', article: 'Art. 1' },
  { right: 'Right to effective remedy', article: 'Art. 47' },
  { right: 'Rights of the child', article: 'Art. 24' },
  { right: 'Workers\' rights', article: 'Art. 31' },
  { right: 'Right to good administration', article: 'Art. 41' },
] as const;

const mapOversightType = (level: string): string => {
  if (level === 'L1' || level === 'L2') return 'pre_decision';
  if (level === 'L3') return 'concurrent';
  return 'post_hoc';
};

/** Generate structured FRIA JSON from manifest data */
export const generateFriaStructured = (input: FriaGeneratorInput): FriaStructuredPayload => {
  const { manifest, organization, assessor } = input;
  const today = new Date().toISOString().split('T')[0]!;
  const riskClass = manifest.compliance?.eu_ai_act?.risk_class ?? '';
  const firstSeverity = deriveRiskLevel(riskClass);

  return {
    toolSlug: manifest.agent_id,
    assessmentId: generateFriaId(),
    date: today,
    sections: {
      general_info: {
        toolName: manifest.display_name,
        vendor: manifest.owner?.team ?? '',
        purpose: manifest.description,
        domain: mapDomain(manifest),
        riskLevel: riskClass,
        version: manifest.version,
        provider: manifest.model?.provider ?? '',
        deploymentContext: '',
        assessorName: assessor ?? '',
        assessorTitle: '',
        geographicScope: '',
        organisation: organization ?? manifest.owner?.team ?? '',
        organisationType: '',
      },
      affected_persons: {
        categories: [],
        vulnerableGroups: false,
        estimatedCount: '',
        description: '',
      },
      specific_risks: {
        risks: CHARTER_RIGHTS.map((cr, i) => ({
          right: cr.right,
          article: cr.article,
          severity: i === 0 && firstSeverity !== '[H/M/L/N]' ? firstSeverity : '',
          likelihood: '',
          description: '',
          affectedGroups: '',
          mitigation: '',
        })),
      },
      human_oversight: {
        hasHumanOversight: ['L1', 'L2', 'L3'].includes(manifest.autonomy_level),
        oversightType: mapOversightType(manifest.autonomy_level),
        mechanism: manifest.autonomy_evidence?.human_approval_gates > 0
          ? `${manifest.autonomy_evidence.human_approval_gates} human approval gate(s) detected`
          : '',
        responsibleRole: '',
        escalationProcess: '',
        reviewFrequency: '',
      },
      mitigation_measures: {
        measures: [],
        incidentResponse: '',
        communicationPlan: '',
        suspensionCriteria: '',
        remediationProcess: '',
        internalComplaint: '',
        externalComplaint: '',
      },
      monitoring_plan: {
        frequency: '',
        metrics: [],
        responsibleTeam: '',
        reviewProcess: '',
        nextReviewDate: '',
        dpiaReference: '',
        legalBasis: '',
        overallRiskDecision: '',
        conditionsForDeployment: '',
      },
    },
  };
};

// --- Markdown Generator ---

export const generateFria = (input: FriaGeneratorInput): FriaResult => {
  const { manifest, template, organization, assessor, impact, mitigation, approval } = input;
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

  // Impact description — replace placeholder or leave as manual
  if (impact) {
    markdown = markdown.replace('[e.g., AI may produce biased outcomes against certain ethnic groups in credit decisions]', impact);
    prefilledFields.push('Impact description');
  } else {
    manualFields.push('Fundamental Rights risk descriptions');
  }

  manualFields.push('Affected groups');

  // Mitigation measures — replace placeholder or leave as manual
  if (mitigation) {
    markdown = markdown.replace('[e.g., Regular bias audits, human review of rejections, fairness metrics monitoring]', mitigation);
    prefilledFields.push('Mitigation measures');
  } else {
    manualFields.push('Mitigation measures');
  }

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

  // 10. Sign-off
  manualFields.push('Assessor sign-off');
  manualFields.push('DPO sign-off');

  if (approval) {
    markdown = markdown.replace(
      'Decision-maker: _________________ Date: _________',
      `Decision-maker: ${approval} Date: ${new Date().toISOString().split('T')[0]}`,
    );
    prefilledFields.push('Decision-maker sign-off');
  } else {
    manualFields.push('Decision-maker sign-off');
  }

  manualFields.push('Market surveillance notification');

  const structured = generateFriaStructured(input);

  return Object.freeze({
    markdown,
    structured,
    prefilledFields: Object.freeze([...prefilledFields]),
    manualFields: Object.freeze([...manualFields]),
  });
};
