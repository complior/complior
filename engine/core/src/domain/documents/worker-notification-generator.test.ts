import { describe, it, expect } from 'vitest';
import { generateWorkerNotification } from './worker-notification-generator.js';
import { createMockManifest } from '../../test-helpers/factories.js';

const TEMPLATE = `# Template 4: Worker Notification of High-Risk AI Use

**Obligation:** eu-ai-act-OBL-012
**Article:** Article 26(7)
**For:** Deployers (employers)
**Format:** DOCX / PDF / Email

## Document Structure:

### 1. Header
- From: [Company Name, HR Department / Management]
- To: [Workers / Works Council / Union Representative]
- Date: [Date]
- Subject: Notification of High-Risk AI System Deployment per EU AI Act Article 26(7)

### 2. Notification Body

Dear [Workers / Works Council],

In accordance with Article 26(7) of the EU Artificial Intelligence Act (Regulation (EU) 2024/1689), we hereby inform you that [Company Name] intends to deploy the following high-risk AI system(s) in the workplace:

**AI System Details:**
- System name: [Name]
- Provider: [Provider name]
- Purpose: [What the system does in plain language]
- Deployment date: [Planned date]
- Affected roles/departments: [List]

**How the system works:**
[Plain language description: what data it processes, what decisions/recommendations it makes, how it affects workers]

**Your rights:**
- Human oversight: All AI-assisted decisions are reviewed by [named person/role] before implementation
- You have the right to request an explanation of any AI-influenced decision affecting you (Article 86)
- You may lodge a complaint with [internal contact] or with the national market surveillance authority
- Your personal data is processed in accordance with GDPR — see our privacy notice [link/reference]

**Contact:**
For questions or concerns about this AI system, please contact: [Name, Title, Email, Phone]

Signed: [Management representative name and title]

### 3. Acknowledgment
- [ ] I acknowledge receipt of this notification
- Employee name: _________________
- Date: _________________
- Signature: _________________
`;

describe('generateWorkerNotification', () => {
  it('pre-fills system name from manifest', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('System name: Test Agent');
    expect(result.prefilledFields).toContain('System name');
  });

  it('pre-fills provider from manifest', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('Provider: OpenAI');
    expect(result.prefilledFields).toContain('Provider');
  });

  it('pre-fills purpose/description from manifest', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('Purpose: An AI agent for testing compliance');
    expect(result.prefilledFields).toContain('Purpose');
  });

  it('pre-fills company name from owner.team when not provided', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('Acme Corp, HR Department / Management');
    expect(result.markdown).toContain('Acme Corp intends to deploy');
    expect(result.prefilledFields).toContain('Company Name');
  });

  it('uses explicit companyName over manifest.owner.team', () => {
    const result = generateWorkerNotification({
      manifest: createMockManifest(),
      template: TEMPLATE,
      companyName: 'Custom Inc',
    });
    expect(result.markdown).toContain('Custom Inc, HR Department / Management');
    expect(result.markdown).toContain('Custom Inc intends to deploy');
    expect(result.markdown).not.toContain('Acme Corp');
  });

  it('pre-fills human oversight from responsible_person', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    expect(result.markdown).toContain('reviewed by Jane Doe before');
    expect(result.prefilledFields).toContain('Human oversight person');
  });

  it('fills contact info when provided', () => {
    const result = generateWorkerNotification({
      manifest: createMockManifest(),
      template: TEMPLATE,
      contactName: 'John Smith',
      contactEmail: 'john@acme.com',
      contactPhone: '+1-555-0100',
    });
    expect(result.markdown).toContain('John Smith, john@acme.com, +1-555-0100');
    expect(result.prefilledFields).toContain('Contact details');
    expect(result.prefilledFields).toContain('Internal contact');
  });

  it('leaves manual fields as placeholders', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    expect(result.manualFields).toContain('Worker impact description');
    expect(result.manualFields).toContain('Management signature');
    expect(result.manualFields).toContain('Employee acknowledgment');
    expect(result.manualFields).toContain('Privacy notice reference');
  });

  it('fills deployment date when provided', () => {
    const result = generateWorkerNotification({
      manifest: createMockManifest(),
      template: TEMPLATE,
      deploymentDate: '2026-04-01',
    });
    expect(result.markdown).toContain('Deployment date: 2026-04-01');
    expect(result.prefilledFields).toContain('Deployment date');
    expect(result.manualFields).not.toContain('Deployment date');
  });

  it('returns correct prefilledFields/manualFields counts', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    // Auto-filled: Company Name, Date, System name, Provider, Purpose, Human oversight person
    expect(result.prefilledFields.length).toBeGreaterThanOrEqual(6);
    // Manual: Deployment date, Affected roles, System description, Worker impact, Internal contact,
    //         Contact details, Management signature, Recipients, Employee acknowledgment, Privacy notice
    expect(result.manualFields.length).toBeGreaterThanOrEqual(8);
  });

  it('returns frozen result', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.prefilledFields)).toBe(true);
    expect(Object.isFrozen(result.manualFields)).toBe(true);
  });

  it('fills affected roles when provided', () => {
    const result = generateWorkerNotification({
      manifest: createMockManifest(),
      template: TEMPLATE,
      affectedRoles: 'Customer Support, Sales',
    });
    expect(result.markdown).toContain('Affected roles/departments: Customer Support, Sales');
    expect(result.prefilledFields).toContain('Affected roles');
    expect(result.manualFields).not.toContain('Affected roles');
  });

  it('fills date with current ISO date', () => {
    const result = generateWorkerNotification({ manifest: createMockManifest(), template: TEMPLATE });
    const today = new Date().toISOString().split('T')[0]!;
    expect(result.markdown).toContain(`Date: ${today}`);
    expect(result.prefilledFields).toContain('Date');
  });
});
