import { describe, it, expect, beforeEach } from 'vitest';
import { runLayer2, validateDocument, loadValidators, measureSectionDepth, measureSemanticDepth, layer2ToCheckResults } from './layer2-docs.js';
import { hasAiReviewMarker, extractReviewDate } from './layer2-parsing.js';
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
and Level 3 for compliance officers and management who oversee AI governance per Art. 4.
Each level has specific learning objectives, materials, and certification requirements in the HR system.
Completion rates must reach 95% within 30 days of onboarding. Monthly reports to compliance committee.
- Level 1: General awareness (4 hours)
- Level 2: Technical depth (16 hours)
- Level 3: Governance certification (40 hours)

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

  it('aggregates child section content under parent headings', () => {
    const techDocValidator: DocumentValidator = {
      document: 'tech-documentation',
      obligation: 'eu-ai-act-OBL-010',
      article: 'Art. 11',
      file_patterns: ['TECH-DOCUMENTATION.md'],
      required_sections: [
        { title: 'General Description', required: true },
        { title: 'System Elements', required: true },
      ],
    };

    const content = `# Technical Documentation

## General Description
This AI system is a classification engine used for high-risk compliance assessment.
It processes documents against the EU AI Act requirements per Art. 11 obligations.
Quarterly reviews ensure continued compliance with all applicable standards.
- Input: regulatory documents
- Output: compliance scores with 95% accuracy target

## System Elements

### 2.1 Architecture
The system uses a layered architecture with deterministic scanning pipelines.
Each layer handles a specific level of analysis from file presence to deep AST inspection.
Components are orchestrated by a daemon process that monitors file changes in real-time.
The architecture is designed per ISO 25010 quality model with documented SLA targets.
- Scanner engine with 5 detection layers
- Evidence chain with ed25519 signatures

### 2.2 Components
The core components include the file watcher, scanner engine, and reporting module.
All components are independently testable and communicate via typed event bus.
Performance monitoring tracks KPI metrics with automated alerts at >5% deviation.
- File watcher: <200ms detection latency
- Scanner: processes 1000 files/minute
`;
    const result = validateDocument(techDocValidator, content);

    // With grouped extraction, ### subsections aggregate under ## System Elements
    expect(result.status).toBe('VALID');
    expect(result.shallowSections).toBeUndefined();
  });

  it('handles mixed heading levels — only marks truly shallow sections', () => {
    const mixedValidator: DocumentValidator = {
      document: 'tech-documentation',
      obligation: 'eu-ai-act-OBL-010',
      article: 'Art. 11',
      file_patterns: ['TECH-DOCUMENTATION.md'],
      required_sections: [
        { title: 'Section A', required: true },
        { title: 'Section B', required: true },
      ],
    };

    const content = `# Document

## Section A

### A.1 Details
This subsection provides comprehensive documentation as required by the EU AI Act.
Assessment conducted on 2026-01-15 covering all applicable requirements per Art. 9.
Key findings include a 95% compliance rate across all evaluated criteria.
- Item 1: Detailed analysis
- Item 2: Evidence of compliance

### A.2 More Details
Additional documentation with quarterly review schedule and SLA targets.
Monitoring dashboard tracks KPIs with automated threshold alerts.
All measures documented per ISO 42001 requirements for ongoing compliance.
- Monthly audits
- Annual comprehensive review

## Section B
This section provides additional configuration and deployment documentation as required by Art. 11.
The system must be deployed with proper logging and monitoring. Reviews conducted quarterly per ISO 42001.
All deployment records are maintained for 5 years with 99.9% availability SLA targets.
- Deployment checklist verified before each release
- Rollback procedures documented and tested
`;
    const result = validateDocument(mixedValidator, content);

    // Section A has rich subsections → not shallow
    // Section B now has substantive content → not shallow
    // Both sections have completenessScore >= 50 → VALID
    expect(result.status).toBe('VALID');
  });

  it('works with single-level headings (no regression)', () => {
    const content = `# AI Literacy Policy

## Training Program
The company has established a comprehensive AI literacy training program that covers all employees.
Training covers EU AI Act obligations, risk assessment procedures, and practical compliance per Art. 4.
Sessions are conducted quarterly with updated materials. Completion target is 95% annually.
- Module 1: AI fundamentals and EU AI Act overview
- Module 2: Risk classification and prohibited practices

## Training Levels
Training is delivered at three levels based on the employee's role. Level 1 for general staff,
Level 2 for technical teams, Level 3 for compliance officers. Each level has specific learning
objectives and certification requirements documented in the HR system per GDPR requirements.
Completion rates tracked monthly with SLA target of 90% within 30 days of onboarding.

## Assessment Methods
Assessment uses online quizzes, practical exercises, and scenario-based evaluations.
Pass threshold is 80% for all levels. Re-test within 30 days per Art. 4 requirements.
Records maintained for minimum 5 years. Annual review of assessment materials.
- Knowledge tests with >80% pass rate
- Practical scenario exercises quarterly
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('VALID');
    expect(result.matchedRequired).toBe(3);
    expect(result.missingSections).toHaveLength(0);
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
The assessment was conducted on 2026-01-15 and covers all applicable requirements per Art. 72.
Key findings include a 95% compliance rate across all evaluated criteria and objectives.
The SLA target is within 24 hours response time. Monthly audits are conducted quarterly.
All measures documented per ISO 42001 requirements for ongoing regulatory compliance.
- Item 1: Detailed analysis of requirements
- Item 2: Evidence of compliance measures
- Item 3: Documented procedures and policies`;

    const ctx = createScanCtx([
      createScanFile('AI-LITERACY.md', `# AI Literacy\n## Training Program\n${richSection}\n## Training Levels\n${richSection}\n## Assessment Methods\nBrief.`),
    ]);

    const results = runLayer2(ctx);

    expect(results).toHaveLength(1);
    // 1 out of 3 shallow = 33% < 50% → shallowRatio OK
    // 2 rich sections + 1 shallow → avg completenessScore >= 50 → VALID
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

  it('detects scaffold placeholders and penalizes qualityScore', () => {
    // Scaffold content: good structure but [TODO] placeholders
    const content = `| Field | Value |
| --- | --- |
| Provider | [Company Name] |
| Assessor | [Name, Title] |
| DPO Consulted | [Name, Date] |
- System name: [Name]
- Version: [Number]
- Deployment context: [Where and how the system is used]
As required by Art. 9 of the EU AI Act, the deployer must ensure compliance.`;
    const depth = measureSemanticDepth(content, 'Header');
    expect(depth.placeholderCount).toBeGreaterThanOrEqual(5);
    expect(depth.isShallow).toBe(true);
    expect(depth.feedback).toContain('placeholder');
  });

  it('does not count markdown links as placeholders', () => {
    const content = `See [EU AI Act](https://eur-lex.europa.eu) and [GDPR](https://gdpr-info.eu) for details.
This comprehensive section documents all compliance requirements with Art. 9 references.`;
    const depth = measureSemanticDepth(content, 'References');
    expect(depth.placeholderCount).toBe(0);
  });

  it('marks scaffold table sections as shallow despite good structure', () => {
    const content = `| Fundamental Right | Risk Level | Description | Affected Group | Mitigation |
|---|---|---|---|---|
| Non-discrimination (Charter Art. 21) | [H/M/L/N] | [Description of risk] | [Group] | [Measures] |
| Privacy (Charter Art. 7-8) | [H/M/L/N] | [Description of risk] | [Group] | [Measures] |
| Expression (Charter Art. 11) | [H/M/L/N] | [Description of risk] | [Group] | [Measures] |`;
    const depth = measureSemanticDepth(content, 'Risk Assessment');
    expect(depth.placeholderCount).toBeGreaterThanOrEqual(9);
    expect(depth.isShallow).toBe(true);
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

    // P17: completenessScore ≈ 30 (words+lists only) < 50 → PARTIAL
    expect(result.status).toBe('PARTIAL');
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

  it('detects scaffold documents with placeholders as SHALLOW', () => {
    const scaffoldValidator: DocumentValidator = {
      document: 'fria',
      obligation: 'eu-ai-act-OBL-013',
      article: 'Art. 27',
      file_patterns: ['FRIA.md'],
      required_sections: [
        { title: 'Risk Assessment', required: true },
        { title: 'Impact Analysis', required: true },
        { title: 'Mitigation Measures', required: true },
      ],
    };

    const content = `# Fundamental Rights Impact Assessment

## Risk Assessment
| Right | Risk Level | Description | Group | Mitigation |
|---|---|---|---|---|
| Non-discrimination (Art. 21) | [H/M/L/N] | [Description of risk] | [Group] | [Measures] |
| Privacy (Art. 7-8) | [H/M/L/N] | [Description of risk] | [Group] | [Measures] |

## Impact Analysis
- System name: [Name]
- Provider: [Company Name]
- Version: [Number]
- Intended purpose: [Description of purpose]
- Deployment context: [Where and how the system is used]
- Categories of persons affected: [List]

## Mitigation Measures
| # | Measure | Responsible | Timeline | Status |
|---|---------|------------|----------|--------|
| 1 | [Measure description] | [Name, Title] | [Date] | [Status] |
| 2 | [Measure description] | [Name, Title] | [Date] | [Status] |
`;
    const result = validateDocument(scaffoldValidator, content);

    expect(result.status).toBe('SHALLOW');
    expect(result.shallowSections).toBeDefined();
    expect(result.shallowSections!.length).toBeGreaterThan(0);
    expect(result.sectionFeedback).toBeDefined();
    expect(result.sectionFeedback!.some(f => f.includes('placeholder'))).toBe(true);
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

// --- AI Review Marker ---

describe('hasAiReviewMarker', () => {
  it('detects valid review marker', () => {
    expect(hasAiReviewMarker('some content\n<!-- complior:reviewed 2026-03-26T10:00:00.000Z -->')).toBe(true);
  });

  it('detects marker with flexible whitespace', () => {
    expect(hasAiReviewMarker('<!--  complior:reviewed  2026-03-26T10:00:00Z  -->')).toBe(true);
  });

  it('returns false when no marker present', () => {
    expect(hasAiReviewMarker('# Just a document\n\nSome content.')).toBe(false);
  });

  it('returns false for similar but different comments', () => {
    expect(hasAiReviewMarker('<!-- reviewed 2026-03-26T10:00:00Z -->')).toBe(false);
    expect(hasAiReviewMarker('<!-- complior:draft 2026-03-26T10:00:00Z -->')).toBe(false);
  });
});

describe('extractReviewDate', () => {
  it('extracts ISO timestamp from marker', () => {
    expect(extractReviewDate('<!-- complior:reviewed 2026-03-26T10:00:00.000Z -->')).toBe('2026-03-26T10:00:00.000Z');
  });

  it('returns undefined when no marker', () => {
    expect(extractReviewDate('no marker here')).toBeUndefined();
  });
});

// --- docQuality classification ---

describe('validateDocument docQuality', () => {
  const validator: DocumentValidator = {
    document: 'risk-management',
    obligation: 'eu-ai-act-OBL-005',
    article: 'Art. 9',
    file_patterns: ['RISK-MANAGEMENT.md'],
    required_sections: [
      { title: 'Risk Assessment', required: true },
      { title: 'Mitigation Measures', required: true },
    ],
  };

  it('returns scaffold for EMPTY document', () => {
    const result = validateDocument(validator, '');
    expect(result.docQuality).toBe('scaffold');
    expect(result.status).toBe('EMPTY');
  });

  it('returns scaffold for SHALLOW document', () => {
    const content = `# Risk Management

## Risk Assessment
[TODO: Describe risks]

## Mitigation Measures
[TODO: Describe mitigations]
`;
    const result = validateDocument(validator, content);
    expect(result.docQuality).toBe('scaffold');
    expect(result.status).toBe('SHALLOW');
  });

  it('returns draft for VALID document without review marker', () => {
    const content = `# Risk Management

## Risk Assessment
The company has conducted a thorough risk assessment covering all aspects of the AI system deployment.
We identified 12 risk categories including bias, accuracy degradation, and data drift. Each risk is rated
on a 5-point scale for likelihood and impact per Art. 9 requirements. Reviews are conducted quarterly
starting from 2026-01-01. The SLA target is 99.9% uptime with KPI tracking for all risk indicators.
All identified risks must be documented and reviewed within 30 days of detection.
- Bias monitoring: <2% demographic parity gap
- Accuracy tracking: >95% precision target

## Mitigation Measures
For each identified risk, specific mitigation controls have been implemented including automated monitoring
with 99.9% uptime SLA, quarterly bias audits achieving <2% demographic parity gap, and incident response
procedures with 24-hour resolution targets. All measures documented per ISO 42001 requirements.
The deployer must ensure continuous compliance with Art. 9 obligations and report within 72 hours.
- Automated monitoring dashboards with threshold alerts
- Incident response within 4 hours for critical issues
`;
    const result = validateDocument(validator, content);
    expect(result.docQuality).toBe('draft');
    expect(result.status).toBe('VALID');
  });

  it('returns reviewed for document with AI review marker', () => {
    const content = `# Risk Management

## Risk Assessment
The company has conducted a thorough risk assessment covering all aspects of the AI system deployment.
We identified 12 risk categories including bias, accuracy degradation, and data drift. Each risk is rated
on a 5-point scale for likelihood and impact per Art. 9 requirements. Annual reviews are conducted.

## Mitigation Measures
For each identified risk, specific mitigation controls have been implemented including automated monitoring
with 99.9% uptime SLA, quarterly bias audits achieving <2% demographic parity gap, and incident response
procedures with 24-hour resolution targets. All measures documented per ISO 42001 requirements.

<!-- complior:reviewed 2026-03-26T10:00:00.000Z -->
`;
    const result = validateDocument(validator, content);
    expect(result.docQuality).toBe('reviewed');
  });

  it('returns scaffold for PARTIAL document (missing sections)', () => {
    const content = `# Risk Management

## Risk Assessment
Some basic content about risk assessment.
`;
    const result = validateDocument(validator, content);
    expect(result.docQuality).toBe('scaffold');
    expect(result.status).toBe('PARTIAL');
  });

  it('reviewed overrides SHALLOW status when marker present', () => {
    const content = `# Risk Management

## Risk Assessment
[TODO: Fill in]

## Mitigation Measures
[TODO: Fill in]

<!-- complior:reviewed 2026-03-26T10:00:00.000Z -->
`;
    const result = validateDocument(validator, content);
    expect(result.docQuality).toBe('reviewed');
  });
});

// --- P17: Low-quality VALID → PARTIAL ---

describe('P17: quality-based PARTIAL status', () => {
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

  it('marks PARTIAL when completenessScore < 50 despite all headings present', () => {
    // Each section has lists + specifics → qualityScore ~30-40 (not shallow individually)
    // but no numeric metrics, legal refs, action items → avg < 50 → PARTIAL
    const content = `# Monitoring Policy

## Monitoring Scope
This section describes the monitoring scope for the AI system and its main components.
The monitoring covers all production deployments and ensures broad compliance coverage.
Regular checks are performed to maintain system integrity across all environments today.
Assessment was last updated on 2026-01-15 with full scope reviewed for accuracy.
- Production environment coverage
- Development environment spot checks

## Frequency
Monitoring is performed regularly according to the defined schedule and requirements.
The frequency is determined by risk level and applicable compliance requirements here.
Higher risk systems are monitored more often. Last review completed on 2026-02-01.
The schedule is documented and tracked consistently for all monitored systems today.
- Continuous automated monitoring
- Periodic manual reviews

## Escalation Procedures
When issues are detected the escalation procedures are followed for proper resolution.
The team is notified promptly and appropriate corrective actions are taken for issues.
Escalation paths are clearly defined for all severity levels. Updated on 2026-03-01.
All escalation events are documented and tracked for future reference and audit needs.
- Level 1: Team lead notification
- Level 2: Department head escalation
`;
    const result = validateDocument(validator, content);

    expect(result.status).toBe('PARTIAL');
    expect(result.completenessScore).toBeDefined();
    expect(result.completenessScore!).toBeLessThan(50);
    expect(result.missingSections).toHaveLength(0);
  });

  it('marks VALID when completenessScore >= 50', () => {
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
    expect(result.completenessScore).toBeDefined();
    expect(result.completenessScore!).toBeGreaterThanOrEqual(50);
  });

  it('layer2ToCheckResults generates low-severity fail for quality-based PARTIAL', () => {
    const l2Result = {
      obligationId: 'eu-ai-act-OBL-020',
      article: 'Art. 72',
      document: 'monitoring-policy',
      status: 'PARTIAL' as const,
      foundSections: ['Monitoring Scope', 'Frequency', 'Escalation Procedures'],
      missingSections: [] as string[],
      totalRequired: 3,
      matchedRequired: 3,
      completenessScore: 30,
      sectionFeedback: ['Section "Monitoring Scope": Add numeric metrics'],
      docQuality: 'scaffold' as const,
    };

    const results = layer2ToCheckResults([l2Result]);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    expect(results[0].severity).toBe('low');
    expect(results[0].message).toContain('content needs enrichment');
    expect(results[0].message).toContain('quality: 30/100');
    expect(results[0].fix).toContain('Enrich content');
    expect(results[0].fix).toContain('Suggestions:');
  });
});
