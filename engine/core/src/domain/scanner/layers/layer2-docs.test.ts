import { describe, it, expect, beforeEach } from 'vitest';
import { runLayer2, validateDocument, loadValidators, measureSectionDepth, measureSemanticDepth } from './layer2-docs.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';
import type { DocumentValidator } from './layer2-docs.js';

describe('loadValidators', () => {
  it('loads all 15 validators', () => {
    const validators = loadValidators();
    expect(validators).toHaveLength(15);

    const documents = validators.map((v) => v.document).sort();
    expect(documents).toEqual([
      'ai-literacy',
      'art5-screening',
      'biometrics-ai-policy',
      'critical-infra-ai-policy',
      'data-governance',
      'declaration-conformity',
      'fria',
      'incident-report',
      'instructions-for-use',
      'migration-ai-policy',
      'monitoring-policy',
      'qms',
      'risk-management',
      'tech-documentation',
      'worker-notification',
    ]);
  });
});

describe('validateDocument', () => {
  const validator: DocumentValidator = {
    document: 'ai-literacy',
    obligation: 'eu-ai-act-OBL-001',
    article: 'Art. 4',
    file_patterns: ['AI-LITERACY.md'],
    required_sections: [
      { title: 'Training Program', required: true },
      { title: 'Training Levels', required: true },
      { title: 'Assessment Methods', required: true },
      { title: 'Record Keeping', required: false },
    ],
  };

  it('returns VALID when all required sections present with substantive content', () => {
    const content = `# AI Literacy Policy

## Training Program
The company has established a comprehensive AI literacy training program that covers all employees
who interact with AI systems in their daily work. The training covers EU AI Act obligations,
risk assessment procedures, and practical compliance measures. Training sessions are conducted
quarterly with updated materials reflecting the latest regulatory guidance from August 2026.
- Module 1: AI fundamentals and EU AI Act overview
- Module 2: Risk classification and prohibited practices
- Module 3: Transparency and disclosure requirements

## Training Levels
Training is delivered at three levels based on the employee's role and interaction with AI systems.
Level 1 is for general staff awareness, Level 2 for technical teams who develop or maintain AI,
and Level 3 for compliance officers and management who oversee AI governance. Each level has
specific learning objectives, materials, and certification requirements documented in the HR system.
Completion rates are tracked monthly and reported to the compliance committee.

## Assessment Methods
Assessment is conducted through a combination of online quizzes, practical exercises, and
scenario-based evaluations. Pass threshold is 80% for all levels. Employees who fail are
given additional training and must re-test within 30 days. Records of all assessments
are maintained for a minimum of 5 years as required by Art. 4 of the EU AI Act.
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('VALID');
    expect(result.matchedRequired).toBe(3);
    expect(result.totalRequired).toBe(3);
    expect(result.missingSections).toHaveLength(0);
    expect(result.obligationId).toBe('eu-ai-act-OBL-001');
  });

  it('returns PARTIAL when some required sections missing', () => {
    const content = `# AI Literacy Policy

## Training Program
Details here.

## Record Keeping
Some records.
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('PARTIAL');
    expect(result.matchedRequired).toBe(1);
    expect(result.missingSections).toContain('Training Levels');
    expect(result.missingSections).toContain('Assessment Methods');
  });

  it('returns EMPTY when document has no content', () => {
    const result = validateDocument(validator, '');

    expect(result.status).toBe('EMPTY');
    expect(result.matchedRequired).toBe(0);
    expect(result.missingSections).toHaveLength(3);
  });

  it('returns EMPTY when document has no headings', () => {
    const content = 'Some text without any headings whatsoever.';
    const result = validateDocument(validator, content);

    expect(result.status).toBe('EMPTY');
    expect(result.matchedRequired).toBe(0);
  });
});

describe('runLayer2', () => {
  // Helper to create doc content that passes depth check (>50 words per section with specifics)
  const makeRichContent = (title: string, sections: readonly string[]): string => {
    const body = sections.map((s) => `## ${s}\nThis section provides comprehensive documentation as required by the EU AI Act regulation.\nThe assessment was conducted on 2026-01-15 and covers all applicable requirements.\nKey findings include a 95% compliance rate across all evaluated criteria.\n- Item 1: Detailed analysis of requirements\n- Item 2: Evidence of compliance measures\n- Item 3: Documented procedures and policies`).join('\n\n');
    return `# ${title}\n\n${body}`;
  };

  it('validates all documents found by L1 (full compliance)', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', makeRichContent('AI Literacy', ['Training Program', 'Training Levels', 'Assessment Methods'])),
      createScanFile('ART5-SCREENING.md', makeRichContent('Screening', ['Prohibited Practices', 'Screening Results', 'Mitigations'])),
      createScanFile('FRIA.md', makeRichContent('FRIA', ['Risk Assessment', 'Impact Analysis', 'Mitigation Measures'])),
      createScanFile('WORKER-NOTIFICATION.md', makeRichContent('Workers', ['Notification Scope', 'Affected Workers', 'Timeline', 'Delivery Tracking'])),
      createScanFile('TECH-DOCUMENTATION.md', makeRichContent('Tech', ['General Description', 'System Elements', 'Monitoring, Functioning and Control', 'Validation and Testing', 'Accuracy, Robustness and Cybersecurity'])),
      createScanFile('INCIDENT-REPORT.md', makeRichContent('Incident', ['Incident Description', 'Root Cause', 'Corrective Measures', 'Timeline of Events'])),
      createScanFile('DECLARATION-OF-CONFORMITY.md', makeRichContent('DoC', ['Conformity Statement', 'Standards Applied', 'Evidence'])),
      createScanFile('MONITORING-POLICY.md', makeRichContent('Monitoring', ['Monitoring Scope', 'Frequency', 'Escalation Procedures'])),
      createScanFile('RISK-MANAGEMENT.md', makeRichContent('Risk', ['Known Risks', 'Misuse Scenarios', 'Residual Risk Assessment'])),
      createScanFile('DATA-GOVERNANCE.md', makeRichContent('Data', ['Data Sources', 'Collection Methods', 'Quality Metrics'])),
      createScanFile('QMS.md', makeRichContent('QMS', ['Compliance Strategy', 'Design Control', 'Testing Procedures'])),
      createScanFile('INSTRUCTIONS-FOR-USE.md', makeRichContent('Instructions', ['Intended Purpose', 'Capabilities', 'Limitations'])),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(12);
    expect(results.every((r) => r.status === 'VALID')).toBe(true);
  });

  it('skips documents not found by L1', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', makeRichContent('AI Literacy', ['Training Program', 'Training Levels', 'Assessment Methods'])),
      createScanFile('src/app.ts', 'function main() {}'),
    ]);

    const results = runLayer2(ctx);

    // Only AI-LITERACY.md matched a validator
    expect(results).toHaveLength(1);
    expect(results[0].document).toBe('ai-literacy');
    expect(results[0].status).toBe('VALID');
  });

  it('handles partial documents correctly', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\nContent only.`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('PARTIAL');
    expect(results[0].matchedRequired).toBe(1);
    expect(results[0].missingSections).toContain('Training Levels');
    expect(results[0].missingSections).toContain('Assessment Methods');
  });

  it('handles empty documents correctly', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', ''),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('EMPTY');
  });

  it('validates documents in nested directories', () => {
    const ctx = createScanCtx([
      createScanFile('docs/compliance/AI-LITERACY.md', makeRichContent('AI Literacy', ['Training Program', 'Training Levels', 'Assessment Methods'])),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('VALID');
  });

  it('detects SHALLOW documents with heading-only content', () => {
    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\nBrief.\n## Training Levels\nTODO.\n## Assessment Methods\nPending.`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('SHALLOW');
    expect(results[0].shallowSections).toBeDefined();
    expect(results[0].shallowSections?.length).toBeGreaterThan(0);
  });

  it('returns VALID when some sections shallow but not over 50%', () => {
    const richSection = `This section provides comprehensive documentation as required by the EU AI Act regulation.
The assessment was conducted on 2026-01-15 and covers all applicable requirements.
Key findings include a 95% compliance rate across all evaluated criteria.
- Item 1: Detailed analysis of requirements
- Item 2: Evidence of compliance measures`;

    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\n${richSection}\n## Training Levels\n${richSection}\n## Assessment Methods\nBrief.`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    // 1 out of 3 shallow = 33% < 50% → VALID
    expect(results[0].status).toBe('VALID');
  });
});

describe('measureSectionDepth', () => {
  it('detects shallow content (few words, no structure)', () => {
    const depth = measureSectionDepth('Brief content here.');
    expect(depth.isShallow).toBe(true);
    expect(depth.wordCount).toBeLessThan(50);
    expect(depth.hasLists).toBe(false);
    expect(depth.hasTables).toBe(false);
    expect(depth.hasSpecifics).toBe(false);
  });

  it('detects rich content with enough words', () => {
    const words = Array(60).fill('compliance').join(' ');
    const depth = measureSectionDepth(words);
    expect(depth.isShallow).toBe(false);
    expect(depth.wordCount).toBeGreaterThanOrEqual(50);
  });

  it('detects lists as substantive', () => {
    const depth = measureSectionDepth('Overview:\n- Item one\n- Item two\n- Item three');
    expect(depth.hasLists).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects numbered lists', () => {
    const depth = measureSectionDepth('Steps:\n1. First step\n2. Second step');
    expect(depth.hasLists).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects tables as substantive', () => {
    const depth = measureSectionDepth('| Name | Value |\n| --- | --- |\n| Test | 42 |');
    expect(depth.hasTables).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects dates as specifics', () => {
    const depth = measureSectionDepth('Completed on 2026-01-15.');
    expect(depth.hasSpecifics).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects percentages as specifics', () => {
    const depth = measureSectionDepth('Achieved 95% compliance rate.');
    expect(depth.hasSpecifics).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects article references as specifics', () => {
    const depth = measureSectionDepth('As required by Art. 50 of the EU AI Act.');
    expect(depth.hasSpecifics).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('detects euro amounts as specifics', () => {
    const depth = measureSectionDepth('Maximum fine: €35M or 7% of turnover.');
    expect(depth.hasSpecifics).toBe(true);
    expect(depth.isShallow).toBe(false);
  });

  it('handles empty content', () => {
    const depth = measureSectionDepth('');
    expect(depth.isShallow).toBe(true);
    expect(depth.wordCount).toBe(0);
  });

  it('counts sentences correctly', () => {
    const depth = measureSectionDepth('First sentence. Second sentence! Third sentence?');
    expect(depth.sentenceCount).toBe(3);
  });
});

describe('measureSemanticDepth', () => {
  it('detects numeric metrics (percentages)', () => {
    const depth = measureSemanticDepth('System achieves 99.5% uptime with less than 50ms latency.', 'Performance');
    expect(depth.hasNumericMetrics).toBe(true);
  });

  it('detects numeric metrics (unit-based counts)', () => {
    const depth = measureSemanticDepth('Processing up to 1000 requests per second with 5 errors maximum.', 'Capacity');
    expect(depth.hasNumericMetrics).toBe(true);
  });

  it('detects legal references (Art. numbers)', () => {
    const depth = measureSemanticDepth('As required by Art. 9 of the EU AI Act, risk management is mandatory.', 'Legal');
    expect(depth.hasLegalReferences).toBe(true);
  });

  it('detects legal references (GDPR)', () => {
    const depth = measureSemanticDepth('Data processing complies with GDPR requirements for personal data.', 'Data');
    expect(depth.hasLegalReferences).toBe(true);
  });

  it('detects legal references (ISO standards)', () => {
    const depth = measureSemanticDepth('The system is certified under ISO 27001 information security standard.', 'Security');
    expect(depth.hasLegalReferences).toBe(true);
  });

  it('detects legal references (NIST)', () => {
    const depth = measureSemanticDepth('Following NIST AI Risk Management Framework guidelines.', 'Framework');
    expect(depth.hasLegalReferences).toBe(true);
  });

  it('detects date references (ISO dates)', () => {
    const depth = measureSemanticDepth('Last review completed on 2026-03-15 with next review scheduled.', 'Timeline');
    expect(depth.hasDateReferences).toBe(true);
  });

  it('detects date references (frequency terms)', () => {
    const depth = measureSemanticDepth('Reviews are conducted quarterly with annual comprehensive audits.', 'Schedule');
    expect(depth.hasDateReferences).toBe(true);
  });

  it('detects date references (quarter notation)', () => {
    const depth = measureSemanticDepth('Target completion by Q2 2026 with interim milestones.', 'Timeline');
    expect(depth.hasDateReferences).toBe(true);
  });

  it('detects action items (must/shall)', () => {
    const depth = measureSemanticDepth('The deployer must ensure human oversight. The system shall log all decisions.', 'Requirements');
    expect(depth.hasActionItems).toBe(true);
  });

  it('detects action items (required to)', () => {
    const depth = measureSemanticDepth('Operators are required to maintain records for 5 years.', 'Obligations');
    expect(depth.hasActionItems).toBe(true);
  });

  it('detects measurable targets (SLA/KPI)', () => {
    const depth = measureSemanticDepth('The SLA specifies 99.9% availability with KPI tracking dashboard.', 'Targets');
    expect(depth.hasMeasurableTargets).toBe(true);
  });

  it('detects measurable targets (within timeframe)', () => {
    const depth = measureSemanticDepth('All incidents must be reported within 72 hours of detection.', 'Response');
    expect(depth.hasMeasurableTargets).toBe(true);
  });

  it('generates actionable feedback for missing signals', () => {
    const depth = measureSemanticDepth('Some generic text about the system.', 'Overview');
    expect(depth.feedback).toContain('Section "Overview"');
    expect(depth.feedback).toContain('Add numeric metrics');
    expect(depth.feedback).toContain('Add legal references');
  });

  it('returns adequate feedback when all signals present', () => {
    const content = `As required by Art. 9 of the EU AI Act, the system must achieve 99.9% accuracy.
Reviews are conducted quarterly starting from 2026-01-01.
The SLA target is within 24 hours response time for all incidents.
- Monitoring dashboard tracks KPIs
- Automated alerts for threshold breaches
| Metric | Target | Current |
| --- | --- | --- |
| Uptime | 99.9% | 99.95% |`;
    const depth = measureSemanticDepth(content, 'Monitoring');
    expect(depth.feedback).toBe('Section "Monitoring": adequate');
  });

  it('gives low qualityScore for shallow generic text', () => {
    const depth = measureSemanticDepth('Brief placeholder text.', 'Overview');
    expect(depth.qualityScore).toBeLessThan(30);
    expect(depth.isShallow).toBe(true);
  });

  it('gives high qualityScore for rich content with metrics, legal refs, dates', () => {
    const content = `As required by Art. 9 of the EU AI Act, the system must achieve 99.9% accuracy.
Reviews are conducted quarterly starting from 2026-01-01.
The SLA target is within 24 hours response time for all incidents.
This comprehensive section documents all compliance requirements and obligations.
The risk management framework covers identification, assessment, and mitigation of all known risks.
Ongoing monitoring ensures continuous compliance with regulatory requirements.
- Monitoring dashboard tracks KPIs
- Automated alerts for threshold breaches
| Metric | Target | Current |
| --- | --- | --- |
| Uptime | 99.9% | 99.95% |`;
    const depth = measureSemanticDepth(content, 'Monitoring');
    expect(depth.qualityScore).toBeGreaterThanOrEqual(70);
    expect(depth.isShallow).toBe(false);
  });

  it('inherits base SectionDepth properties', () => {
    const depth = measureSemanticDepth('- Item 1\n- Item 2\n- Item 3', 'List Section');
    expect(depth.hasLists).toBe(true);
    expect(depth.wordCount).toBeGreaterThan(0);
    expect(depth.sentenceCount).toBeGreaterThan(0);
  });

  it('handles empty content', () => {
    const depth = measureSemanticDepth('', 'Empty');
    expect(depth.qualityScore).toBe(0);
    expect(depth.isShallow).toBe(true);
    expect(depth.wordCount).toBe(0);
  });

  it('overrides isShallow based on qualityScore not just word count', () => {
    // Content with few words but has lists + specifics + legal ref = qualityScore >= 30
    const content = '- Art. 9 compliance check\n- 95% accuracy achieved';
    const depth = measureSemanticDepth(content, 'Checks');
    // Has lists (10) + specifics (10) + numeric metrics (15) + legal ref (10) + measurable (10) = 55
    expect(depth.wordCount).toBeLessThan(50);
    expect(depth.isShallow).toBe(false);
  });
});

describe('validateDocument semantic features', () => {
  const validator: DocumentValidator = {
    document: 'monitoring-policy',
    obligation: 'eu-ai-act-OBL-020',
    article: 'Art. 72',
    file_patterns: ['MONITORING-POLICY.md'],
    required_sections: [
      { title: 'Monitoring Scope', required: true },
      { title: 'Frequency', required: true },
      { title: 'Escalation Procedures', required: true },
    ],
  };

  it('returns sectionFeedback for sections missing semantic signals', () => {
    // Sections have 50+ words and lists (qualityScore >= 30 → not shallow),
    // but lack numeric metrics, legal references, dates, and measurable targets → feedback generated
    const content = `# Monitoring Policy

## Monitoring Scope
This section describes the monitoring scope for the AI system. The monitoring covers
all production deployments and ensures continuous compliance. Regular checks are performed
to maintain system integrity. Additional monitoring is applied to high-risk components.
Feedback loops help improve the monitoring process over time. Documentation is maintained
for audit purposes across the entire lifecycle.
- Production environment coverage
- Development environment spot checks
- Staging environment validation

## Frequency
Monitoring is performed regularly according to the schedule. The frequency is determined
by risk level and regulatory requirements. Higher risk systems are monitored more often.
The schedule is reviewed periodically to ensure adequacy. All monitoring activities are
documented and tracked. Adjustments are made based on incident trends.
- Continuous automated monitoring
- Periodic manual reviews
- Ad-hoc assessments on demand

## Escalation Procedures
When issues are detected, the escalation procedures are followed. The team is notified
promptly and corrective actions are taken. Escalation paths are clearly defined. Senior
management is involved for critical issues. All escalations are tracked and documented.
Post-incident reviews help improve the process.
- Level 1: Team lead notification
- Level 2: Department head escalation
- Level 3: Executive escalation
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('VALID');
    expect(result.sectionFeedback).toBeDefined();
    expect(result.sectionFeedback!.length).toBeGreaterThan(0);
    // Should suggest adding numeric metrics, legal references, etc.
    expect(result.sectionFeedback!.some((f) => f.includes('Add numeric metrics'))).toBe(true);
  });

  it('returns completenessScore for validated documents', () => {
    const content = `# Monitoring Policy

## Monitoring Scope
Brief.

## Frequency
TODO.

## Escalation Procedures
Pending.
`;
    const result = validateDocument(validator, content);

    expect(result.completenessScore).toBeDefined();
    expect(typeof result.completenessScore).toBe('number');
  });

  it('returns high completenessScore for rich semantic content', () => {
    const content = `# Monitoring Policy

## Monitoring Scope
As required by Art. 72 of the EU AI Act, monitoring must cover all production deployments.
The system shall maintain 99.9% uptime with SLA targets reviewed quarterly starting 2026-01-01.
The monitoring scope encompasses all AI system components including model performance, data quality,
and user interaction patterns. Regular assessments are conducted to ensure continued compliance.
Automated dashboards track KPIs across all monitored systems.
- Real-time performance tracking
- Anomaly detection with threshold alerts at >5% deviation
| Metric | Target | Review Frequency |
| --- | --- | --- |
| Accuracy | >95% | Monthly |
| Latency | <200ms | Weekly |

## Frequency
The system must be monitored continuously with formal reviews conducted quarterly.
Art. 9 requires ongoing risk assessment. Annual comprehensive audits are mandatory.
Incident reports must be filed within 72 hours as per GDPR and EU AI Act requirements.
The monitoring frequency is calibrated to the risk level as specified in ISO 42001.
Monthly automated scans ensure compliance with all applicable standards and benchmarks.
- Daily automated health checks
- Weekly performance reviews with KPI tracking
- Monthly comprehensive compliance audits

## Escalation Procedures
All incidents shall be escalated within 24 hours to the designated compliance officer.
As required by Art. 62, serious incidents must be reported to national authorities.
The SLA for critical issues requires resolution within 4 hours.
Escalation procedures are reviewed annually and updated based on lessons learned.
Documentation of all escalation events must be maintained for at least 5 years.
- Level 1: Automated alert (within 5 minutes)
- Level 2: Team notification (within 1 hour)
- Level 3: Management escalation (within 4 hours)
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('VALID');
    expect(result.completenessScore).toBeDefined();
    expect(result.completenessScore!).toBeGreaterThanOrEqual(60);
  });

  it('returns low completenessScore for shallow content', () => {
    const content = `# Monitoring Policy

## Monitoring Scope
Brief overview.

## Frequency
Regular checks.

## Escalation Procedures
Contact support.
`;
    const result = validateDocument(validator, content);

    expect(result.completenessScore).toBeDefined();
    expect(result.completenessScore!).toBeLessThan(30);
  });

  it('does not include sectionFeedback when all sections are adequate', () => {
    const richSection = `As required by Art. 72 of the EU AI Act, the system must achieve 99.9% accuracy.
Reviews are conducted quarterly starting from 2026-01-01.
The SLA target is within 24 hours response time for all incidents.
This comprehensive section documents all compliance requirements and obligations.
The risk management framework covers identification, assessment, and mitigation of all known risks.
Ongoing monitoring ensures continuous compliance with regulatory requirements.
- Monitoring dashboard tracks KPIs
- Automated alerts for threshold breaches
| Metric | Target | Current |
| --- | --- | --- |
| Uptime | 99.9% | 99.95% |`;

    const content = `# Monitoring Policy

## Monitoring Scope
${richSection}

## Frequency
${richSection}

## Escalation Procedures
${richSection}
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('VALID');
    expect(result.sectionFeedback).toBeUndefined();
    expect(result.completenessScore).toBeDefined();
    expect(result.completenessScore!).toBeGreaterThanOrEqual(70);
  });

  it('does not return semantic fields for EMPTY documents', () => {
    const result = validateDocument(validator, '');

    expect(result.status).toBe('EMPTY');
    expect(result.sectionFeedback).toBeUndefined();
    expect(result.completenessScore).toBeUndefined();
  });

  it('does not return semantic fields for PARTIAL documents', () => {
    const content = `# Monitoring Policy

## Monitoring Scope
Some content here about monitoring.
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('PARTIAL');
    expect(result.sectionFeedback).toBeUndefined();
    expect(result.completenessScore).toBeUndefined();
  });
});
