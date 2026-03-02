import type { DocumentValidator } from './layers/layer2-docs.js';

export const DOCUMENT_VALIDATORS: readonly DocumentValidator[] = [
  {
    document: 'ai-literacy',
    obligation: 'OBL-001',
    article: 'Art. 4',
    file_patterns: ['AI-LITERACY.md', 'AI_LITERACY.md', 'ai-literacy.md', 'ai-literacy-policy.md'],
    required_sections: [
      { title: 'Training Program', required: true },
      { title: 'Training Levels', required: true },
      { title: 'Assessment Methods', required: true },
      { title: 'Record Keeping', required: false },
      { title: 'Roles and Responsibilities', required: false },
    ],
  },
  {
    document: 'art5-screening',
    obligation: 'OBL-002',
    article: 'Art. 5',
    file_patterns: ['ART5-SCREENING.md', 'ART5_SCREENING.md', 'art5-screening.md', 'prohibited-practices.md'],
    required_sections: [
      { title: 'Prohibited Practices', required: true },
      { title: 'Screening Results', required: true },
      { title: 'Mitigations', required: true },
      { title: 'Risk Assessment', required: false },
      { title: 'Review Schedule', required: false },
    ],
  },
  {
    document: 'tech-documentation',
    obligation: 'OBL-005',
    article: 'Art. 11',
    file_patterns: [
      'TECH-DOCUMENTATION.md', 'TECH_DOCUMENTATION.md', 'tech-documentation.md',
      'technical-documentation.md', 'TECHNICAL-DOCUMENTATION.md',
    ],
    required_sections: [
      { title: 'System Description', required: true },
      { title: 'Architecture', required: true },
      { title: 'Data Sources', required: true },
      { title: 'Performance Metrics', required: false },
      { title: 'Limitations', required: false },
    ],
  },
  {
    document: 'monitoring-policy',
    obligation: 'OBL-011',
    article: 'Art. 26',
    file_patterns: ['MONITORING-POLICY.md', 'MONITORING_POLICY.md', 'monitoring-policy.md', 'ai-monitoring-policy.md'],
    required_sections: [
      { title: 'Monitoring Scope', required: true },
      { title: 'Frequency', required: true },
      { title: 'Escalation Procedures', required: true },
      { title: 'Responsible Parties', required: false },
      { title: 'Reporting Requirements', required: false },
    ],
  },
  {
    document: 'worker-notification',
    obligation: 'OBL-012',
    article: 'Art. 26(7)',
    file_patterns: ['WORKER-NOTIFICATION.md', 'WORKER_NOTIFICATION.md', 'worker-notification.md', 'employee-ai-notification.md'],
    required_sections: [
      { title: 'Notification Scope', required: true },
      { title: 'Affected Workers', required: true },
      { title: 'Timeline', required: true },
      { title: 'Communication Channels', required: false },
      { title: 'Acknowledgment Process', required: false },
    ],
  },
  {
    document: 'fria',
    obligation: 'OBL-013',
    article: 'Art. 27',
    file_patterns: ['FRIA.md', 'fria.md', 'fundamental-rights-impact-assessment.md', 'FUNDAMENTAL-RIGHTS-IMPACT-ASSESSMENT.md'],
    required_sections: [
      { title: 'Risk Assessment', required: true },
      { title: 'Impact Analysis', required: true },
      { title: 'Mitigation Measures', required: true },
      { title: 'Stakeholder Consultation', required: false },
      { title: 'Monitoring Plan', required: false },
    ],
  },
  {
    document: 'declaration-conformity',
    obligation: 'OBL-019',
    article: 'Art. 47',
    file_patterns: [
      'DECLARATION-OF-CONFORMITY.md', 'DECLARATION_OF_CONFORMITY.md',
      'declaration-of-conformity.md', 'declaration-conformity.md', 'CONFORMITY.md',
    ],
    required_sections: [
      { title: 'Conformity Statement', required: true },
      { title: 'Standards Applied', required: true },
      { title: 'Evidence', required: true },
      { title: 'Signatory', required: false },
      { title: 'Date of Declaration', required: false },
    ],
  },
  {
    document: 'incident-report',
    obligation: 'OBL-021',
    article: 'Art. 73',
    file_patterns: ['INCIDENT-REPORT.md', 'INCIDENT_REPORT.md', 'incident-report.md', 'ai-incident-report.md'],
    required_sections: [
      { title: 'Incident Description', required: true },
      { title: 'Root Cause', required: true },
      { title: 'Corrective Actions', required: true },
      { title: 'Timeline of Events', required: false },
      { title: 'Lessons Learned', required: false },
    ],
  },
] as const;
