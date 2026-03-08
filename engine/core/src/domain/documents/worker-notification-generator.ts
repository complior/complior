import type { AgentPassport } from '../../types/passport.types.js';

// --- Types ---

export interface WorkerNotificationInput {
  readonly manifest: AgentPassport;
  readonly template: string;
  readonly companyName?: string;
  readonly contactName?: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly deploymentDate?: string;
  readonly affectedRoles?: string;
  readonly impactDescription?: string;
}

export interface WorkerNotificationResult {
  readonly markdown: string;
  readonly prefilledFields: readonly string[];
  readonly manualFields: readonly string[];
}

// --- Helpers ---

const deriveOversightPerson = (manifest: AgentPassport): string | undefined => {
  if (manifest.owner.responsible_person) return manifest.owner.responsible_person;
  if (manifest.autonomy_level === 'L1' || manifest.autonomy_level === 'L2') {
    return 'the designated human supervisor';
  }
  return undefined;
};

const buildContactLine = (name?: string, email?: string, phone?: string): string | undefined => {
  const parts = [name, email, phone].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
};

// --- Generator ---

export const generateWorkerNotification = (input: WorkerNotificationInput): WorkerNotificationResult => {
  const { manifest, template, companyName, contactName, contactEmail, contactPhone, deploymentDate, affectedRoles, impactDescription } = input;
  const prefilledFields: string[] = [];
  const manualFields: string[] = [];

  let markdown = template;
  const today = new Date().toISOString().split('T')[0]!;

  // 1. Company Name — use input or fall back to manifest.owner.team
  const company = companyName ?? manifest.owner.team;
  if (company) {
    markdown = markdown.replaceAll('[Company Name, HR Department / Management]', `${company}, HR Department / Management`);
    markdown = markdown.replaceAll('[Company Name]', company);
    prefilledFields.push('Company Name');
  } else {
    manualFields.push('Company Name');
  }

  // 2. Date header
  markdown = markdown.replaceAll('[Date]', today);
  prefilledFields.push('Date');

  // 3. System name
  markdown = markdown.replace('System name: [Name]', `System name: ${manifest.display_name}`);
  prefilledFields.push('System name');

  // 4. Provider
  markdown = markdown.replace('[Provider name]', manifest.model.provider);
  prefilledFields.push('Provider');

  // 5. Purpose / description
  markdown = markdown.replace('[What the system does in plain language]', manifest.description);
  prefilledFields.push('Purpose');

  // 6. Deployment date
  if (deploymentDate) {
    markdown = markdown.replace('[Planned date]', deploymentDate);
    prefilledFields.push('Deployment date');
  } else {
    manualFields.push('Deployment date');
  }

  // 7. Affected roles
  if (affectedRoles) {
    markdown = markdown.replace('Affected roles/departments: [List]', `Affected roles/departments: ${affectedRoles}`);
    prefilledFields.push('Affected roles');
  } else {
    manualFields.push('Affected roles');
  }

  // 8. How the system works (impact description)
  if (impactDescription) {
    markdown = markdown.replace(
      '[Plain language description: what data it processes, what decisions/recommendations it makes, how it affects workers]',
      impactDescription,
    );
    prefilledFields.push('System description');
  } else {
    manualFields.push('System description (how it works)');
  }

  // 9. How it affects you — always manual (deployment-specific)
  manualFields.push('Worker impact description');

  // 10. Human oversight person
  const oversightPerson = deriveOversightPerson(manifest);
  if (oversightPerson) {
    markdown = markdown.replace('[named person/role]', oversightPerson);
    prefilledFields.push('Human oversight person');
  } else {
    manualFields.push('Human oversight person');
  }

  // 11. Internal contact for complaints
  if (contactName) {
    markdown = markdown.replace('[internal contact]', contactName);
    prefilledFields.push('Internal contact');
  } else {
    manualFields.push('Internal contact');
  }

  // 12. Contact details block
  const contactLine = buildContactLine(contactName, contactEmail, contactPhone);
  if (contactLine) {
    markdown = markdown.replace('[Name, Title, Email, Phone]', contactLine);
    prefilledFields.push('Contact details');
  } else {
    manualFields.push('Contact details');
  }

  // 13-16. Always-manual fields
  manualFields.push('Management signature');
  manualFields.push('Recipients');
  manualFields.push('Employee acknowledgment');
  manualFields.push('Privacy notice reference');

  return Object.freeze({
    markdown,
    prefilledFields: Object.freeze([...prefilledFields]),
    manualFields: Object.freeze([...manualFields]),
  });
};
