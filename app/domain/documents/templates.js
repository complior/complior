({
  getSections: (documentType) => {
    const templates = {
      usage_policy: [
        { sectionCode: 'introduction', title: 'Introduction', description: 'Purpose and objectives of this AI usage policy', sortOrder: 0 },
        { sectionCode: 'scope_and_applicability', title: 'Scope and Applicability', description: 'Who and what this policy covers', sortOrder: 1 },
        { sectionCode: 'roles_and_responsibilities', title: 'Roles and Responsibilities', description: 'Accountability structure for AI governance', sortOrder: 2 },
        { sectionCode: 'approved_tools_inventory', title: 'Approved Tools Inventory', description: 'List of approved AI tools and their use cases', sortOrder: 3 },
        { sectionCode: 'usage_guidelines', title: 'Usage Guidelines', description: 'Rules and best practices for using AI tools', sortOrder: 4 },
        { sectionCode: 'prohibited_uses', title: 'Prohibited Uses', description: 'Explicitly forbidden uses of AI in the organization', sortOrder: 5 },
        { sectionCode: 'monitoring_and_review', title: 'Monitoring and Review', description: 'How compliance with this policy is monitored', sortOrder: 6 },
      ],
      qms_template: [
        { sectionCode: 'management_commitment', title: 'Management Commitment', description: 'Leadership commitment to AI quality management', sortOrder: 0 },
        { sectionCode: 'scope', title: 'Scope', description: 'Scope of the quality management system for AI', sortOrder: 1 },
        { sectionCode: 'quality_policy', title: 'Quality Policy', description: 'Quality objectives and principles for AI systems', sortOrder: 2 },
        { sectionCode: 'organizational_structure', title: 'Organizational Structure', description: 'Roles and reporting lines for AI governance', sortOrder: 3 },
        { sectionCode: 'document_control', title: 'Document Control', description: 'How AI-related documents are managed and versioned', sortOrder: 4 },
        { sectionCode: 'risk_management_process', title: 'Risk Management Process', description: 'Systematic approach to AI risk management', sortOrder: 5 },
        { sectionCode: 'tool_lifecycle', title: 'AI Tool Lifecycle Management', description: 'Processes for evaluating, deploying, and retiring AI tools', sortOrder: 6 },
        { sectionCode: 'training_and_awareness', title: 'Training and Awareness', description: 'AI literacy and competence requirements (Art. 4)', sortOrder: 7 },
        { sectionCode: 'monitoring_and_measurement', title: 'Monitoring and Measurement', description: 'KPIs and metrics for AI system performance', sortOrder: 8 },
        { sectionCode: 'continual_improvement', title: 'Continual Improvement', description: 'Process for ongoing improvement of AI governance', sortOrder: 9 },
      ],
      risk_assessment: [
        { sectionCode: 'executive_summary', title: 'Executive Summary', description: 'Overview of risk assessment findings', sortOrder: 0 },
        { sectionCode: 'risk_identification', title: 'Risk Identification', description: 'Identified risks from AI tool deployment', sortOrder: 1 },
        { sectionCode: 'risk_analysis', title: 'Risk Analysis', description: 'Analysis of likelihood and impact of each risk', sortOrder: 2 },
        { sectionCode: 'risk_evaluation', title: 'Risk Evaluation', description: 'Prioritization and evaluation against risk criteria', sortOrder: 3 },
        { sectionCode: 'risk_treatment', title: 'Risk Treatment', description: 'Mitigation strategies and controls', sortOrder: 4 },
        { sectionCode: 'monitoring_and_review', title: 'Monitoring and Review', description: 'Ongoing risk monitoring procedures', sortOrder: 5 },
        { sectionCode: 'appendix_tool_details', title: 'Appendix: Tool Details', description: 'Technical details of the assessed AI tool', sortOrder: 6 },
      ],
      monitoring_plan: [
        { sectionCode: 'monitoring_objectives', title: 'Monitoring Objectives', description: 'Goals and scope of AI monitoring activities', sortOrder: 0 },
        { sectionCode: 'kpis_and_metrics', title: 'KPIs and Metrics', description: 'Key performance indicators for AI system monitoring', sortOrder: 1 },
        { sectionCode: 'monitoring_schedule', title: 'Monitoring Schedule', description: 'Frequency and timeline of monitoring activities', sortOrder: 2 },
        { sectionCode: 'incident_response', title: 'Incident Response', description: 'Procedures for handling AI-related incidents', sortOrder: 3 },
        { sectionCode: 'reporting_and_escalation', title: 'Reporting and Escalation', description: 'How monitoring results are reported and escalated', sortOrder: 4 },
        { sectionCode: 'review_and_update', title: 'Review and Update', description: 'Process for reviewing and updating the monitoring plan', sortOrder: 5 },
      ],
      employee_notification: [
        { sectionCode: 'notification_header', title: 'Notification Header', description: 'Title, date, and organizational details', sortOrder: 0 },
        { sectionCode: 'ai_systems_description', title: 'AI Systems Description', description: 'Description of AI systems in use (Art. 26(7))', sortOrder: 1 },
        { sectionCode: 'purpose_and_impact', title: 'Purpose and Impact', description: 'How AI affects work processes and decisions', sortOrder: 2 },
        { sectionCode: 'employee_rights', title: 'Employee Rights', description: 'Rights of employees regarding AI decisions', sortOrder: 3 },
        { sectionCode: 'contact_information', title: 'Contact Information', description: 'Who to contact for questions or concerns', sortOrder: 4 },
      ],
    };

    return templates[documentType] || [];
  },

  getDocumentTitle: (documentType, toolName) => {
    const titles = {
      usage_policy: 'AI Usage Policy',
      qms_template: 'Quality Management System Template',
      risk_assessment: 'Risk Management Plan',
      monitoring_plan: 'Monitoring Plan',
      employee_notification: 'Worker Notification',
    };
    const base = titles[documentType] || documentType;
    return toolName ? `${base} — ${toolName}` : base;
  },
})
