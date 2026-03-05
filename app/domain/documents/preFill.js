({
  generate: (tool, documentType, sections) => {
    const name = tool.name || '';
    const vendor = tool.vendorName || '';
    const purpose = tool.purpose || '';
    const domainVal = tool.domain || 'other';
    const riskLevel = tool.riskLevel || 'unknown';
    const dataTypes = Array.isArray(tool.dataTypes) ? tool.dataTypes : [];
    const affectedPersons = Array.isArray(tool.affectedPersons) ? tool.affectedPersons : [];
    const autonomyLevel = tool.autonomyLevel || 'advisory';
    const humanOversight = tool.humanOversight !== false;

    const dataTypesStr = dataTypes.length > 0 ? dataTypes.join(', ') : 'not specified';
    const personsStr = affectedPersons.length > 0 ? affectedPersons.join(', ') : 'not specified';
    const oversightStr = humanOversight ? 'Yes' : 'No';

    const generators = {
      usage_policy: () => ({
        introduction: { text: `This AI Usage Policy governs the deployment and use of "${name}" (provided by ${vendor}) within our organization. The tool is used for: ${purpose}. This policy ensures compliance with the EU AI Act and establishes clear guidelines for responsible AI use.` },
        scope_and_applicability: { text: `This policy applies to all employees, contractors, and third parties who interact with or are affected by "${name}". The tool operates in the ${domainVal} domain and has been classified as ${riskLevel} risk under the EU AI Act. Data types processed: ${dataTypesStr}. Affected persons: ${personsStr}.` },
        roles_and_responsibilities: { text: `AI Governance Lead: Oversees compliance with this policy and the EU AI Act.\nTool Administrator: Manages configuration and access to "${name}".\nEnd Users: Must follow usage guidelines and report any issues.\nDPO/Compliance Officer: Reviews data protection aspects and monitors ongoing compliance.` },
        approved_tools_inventory: { text: `Tool: ${name}\nVendor: ${vendor}\nPurpose: ${purpose}\nDomain: ${domainVal}\nRisk Level: ${riskLevel}\nAutonomy Level: ${autonomyLevel}\nHuman Oversight: ${oversightStr}` },
        usage_guidelines: { text: `1. Use "${name}" only for its intended purpose: ${purpose}.\n2. Do not input sensitive personal data beyond what is necessary.\n3. Always review AI-generated outputs before making decisions affecting individuals.\n4. Report any unexpected behavior or bias to the AI Governance Lead.\n5. Maintain human oversight level: ${autonomyLevel}.` },
        prohibited_uses: { text: `The following uses of "${name}" are prohibited:\n1. Making fully autonomous decisions affecting individuals without human review.\n2. Processing data categories beyond those approved (${dataTypesStr}).\n3. Using the tool for purposes outside the defined scope.\n4. Circumventing human oversight controls.\n5. Any use that would constitute a prohibited practice under Art. 5 EU AI Act.` },
        monitoring_and_review: { text: `This policy will be reviewed at least annually or when:\n- The AI tool is updated significantly.\n- Regulatory requirements change.\n- Incidents or complaints occur.\n- Risk classification changes.\n\nMonitoring includes regular audits of tool usage patterns, compliance checks, and feedback from affected persons.` },
      }),

      qms_template: () => ({
        management_commitment: { text: `Senior management commits to establishing, maintaining, and continually improving an AI Quality Management System (QMS) for "${name}" and all AI tools deployed by the organization. This commitment includes allocating necessary resources, defining quality objectives, and ensuring compliance with the EU AI Act.` },
        scope: { text: `This QMS covers the deployment and operation of "${name}" (${vendor}) used for ${purpose} in the ${domainVal} domain. Risk classification: ${riskLevel}. The system is designed to ensure the tool operates within acceptable quality and safety parameters.` },
        quality_policy: { text: `Our AI quality policy ensures that:\n1. AI tools meet defined performance and safety standards.\n2. Decisions supported by AI are accurate, fair, and transparent.\n3. Human oversight is maintained at all times.\n4. Affected persons (${personsStr}) are treated fairly.\n5. Continuous improvement processes are in place.` },
        organizational_structure: { text: `AI Governance Committee: Strategic oversight and policy approval.\nAI Quality Manager: Day-to-day QMS management.\nTool Owners: Responsible for individual AI tool compliance.\nInternal Auditor: Conducts periodic QMS audits.\nData Protection Officer: Ensures GDPR and AI Act data requirements.` },
        document_control: { text: `All AI-related documents are version-controlled and stored in the compliance platform. Document types include: AI usage policies, risk assessments, FRIA reports, monitoring plans, and incident reports. Changes require review and approval by the AI Quality Manager.` },
        risk_management_process: { text: `Risk management for "${name}" follows a systematic process:\n1. Risk Identification: Identify risks from AI deployment in ${domainVal}.\n2. Risk Analysis: Assess likelihood and impact on affected persons (${personsStr}).\n3. Risk Evaluation: Compare against risk criteria and EU AI Act requirements.\n4. Risk Treatment: Implement mitigation measures.\n5. Monitoring: Continuously monitor residual risks.` },
        tool_lifecycle: { text: `AI Tool Lifecycle for "${name}":\n1. Evaluation: Assess vendor (${vendor}), capability, and compliance.\n2. Deployment: Configure with appropriate oversight (${autonomyLevel}).\n3. Operation: Monitor performance and compliance.\n4. Review: Periodic reassessment of risk level (current: ${riskLevel}).\n5. Retirement: Secure decommissioning and data handling.` },
        training_and_awareness: { text: `Per Art. 4 EU AI Act, all personnel interacting with "${name}" must have sufficient AI literacy. Training covers:\n1. Understanding AI capabilities and limitations.\n2. Recognizing potential biases and errors.\n3. Proper escalation procedures.\n4. Data protection requirements.\n5. Reporting obligations.` },
        monitoring_and_measurement: { text: `Key metrics for "${name}":\n- Accuracy/performance metrics (tool-specific).\n- Incident count and resolution time.\n- User compliance rate.\n- Training completion rate.\n- Audit findings resolution rate.\nMetrics are reviewed monthly and reported to the AI Governance Committee.` },
        continual_improvement: { text: `Improvement process:\n1. Collect feedback from users and affected persons.\n2. Analyze incidents and near-misses.\n3. Review audit findings.\n4. Benchmark against industry best practices.\n5. Update policies and procedures as needed.\n6. Track improvement actions to completion.` },
      }),

      risk_assessment: () => ({
        executive_summary: { text: `This risk management plan assesses the risks associated with deploying "${name}" (by ${vendor}) for ${purpose} in the ${domainVal} domain. The tool has been classified as ${riskLevel} risk under the EU AI Act. This document identifies key risks, analyzes their potential impact on affected persons (${personsStr}), and outlines mitigation strategies.` },
        risk_identification: { text: `Identified risks for "${name}":\n1. Data Quality Risk: Input data (${dataTypesStr}) may contain biases or errors.\n2. Decision Impact Risk: Tool autonomy level (${autonomyLevel}) may affect individuals.\n3. Privacy Risk: Processing of ${dataTypesStr} data types.\n4. Transparency Risk: Affected persons may not understand AI-driven decisions.\n5. Operational Risk: Tool malfunction or unexpected behavior.\n6. Compliance Risk: Changes in regulatory requirements.` },
        risk_analysis: { text: `Risk analysis matrix:\n\nData Quality: Likelihood - Medium | Impact - ${riskLevel === 'high' ? 'High' : 'Medium'}\nDecision Impact: Likelihood - ${autonomyLevel === 'autonomous' ? 'High' : 'Medium'} | Impact - ${riskLevel === 'high' ? 'High' : 'Medium'}\nPrivacy: Likelihood - Medium | Impact - High\nTransparency: Likelihood - ${humanOversight ? 'Low' : 'Medium'} | Impact - Medium\nOperational: Likelihood - Low | Impact - Medium\nCompliance: Likelihood - Low | Impact - High` },
        risk_evaluation: { text: `Priority risks requiring immediate attention:\n1. ${riskLevel === 'high' ? 'HIGH: Decision impact on ' + personsStr + ' requires robust human oversight.' : 'MEDIUM: Standard oversight measures are sufficient.'}\n2. Privacy risk is elevated due to processing of ${dataTypesStr}.\n3. Human oversight is ${humanOversight ? 'in place' : 'NOT in place — immediate action required'}.` },
        risk_treatment: { text: `Mitigation measures:\n1. Implement ${autonomyLevel === 'autonomous' ? 'mandatory human review for all' : 'periodic review of'} AI-assisted decisions.\n2. Regular data quality audits for input data.\n3. Transparency notices to affected persons.\n4. ${humanOversight ? 'Maintain' : 'Establish'} human oversight procedures.\n5. Incident response plan for AI-related failures.\n6. Regular training for AI system operators.` },
        monitoring_and_review: { text: `This risk assessment will be reviewed:\n- Quarterly for ${riskLevel} risk tools.\n- After any significant incident.\n- When the tool is updated.\n- When regulatory guidance changes.\n\nThe AI Governance Lead is responsible for scheduling and conducting reviews.` },
        appendix_tool_details: { text: `Tool Name: ${name}\nVendor: ${vendor}\nPurpose: ${purpose}\nDomain: ${domainVal}\nRisk Level: ${riskLevel}\nAutonomy Level: ${autonomyLevel}\nHuman Oversight: ${oversightStr}\nData Types: ${dataTypesStr}\nAffected Persons: ${personsStr}` },
      }),

      monitoring_plan: () => ({
        monitoring_objectives: { text: `This monitoring plan establishes the framework for ongoing oversight of "${name}" (${vendor}) as required by Art. 26(5) EU AI Act. Objectives:\n1. Ensure the tool operates as intended for ${purpose}.\n2. Detect anomalies, bias, or performance degradation.\n3. Verify continued compliance with ${riskLevel} risk requirements.\n4. Protect the rights of affected persons (${personsStr}).` },
        kpis_and_metrics: { text: `Key Performance Indicators:\n1. Tool Availability: Target >99.5% uptime.\n2. Decision Accuracy: Baseline to be established and monitored.\n3. Bias Metrics: Demographic parity across affected groups.\n4. Incident Rate: Number of AI-related incidents per month.\n5. User Satisfaction: Feedback from operators and affected persons.\n6. Compliance Score: Maintained via compliance platform.` },
        monitoring_schedule: { text: `Monitoring frequency for "${name}" (${riskLevel} risk):\n- Daily: Automated performance monitoring.\n- Weekly: Review of flagged decisions and incidents.\n- Monthly: KPI dashboard review by AI Governance Lead.\n- Quarterly: Full compliance audit.\n- Annually: Complete risk reassessment and tool review.` },
        incident_response: { text: `Incident response procedure:\n1. Detection: User reports or automated alert triggers.\n2. Classification: Severity assessment (Critical/High/Medium/Low).\n3. Containment: Suspend AI decisions if needed, fall back to manual process.\n4. Investigation: Root cause analysis.\n5. Resolution: Fix and verify.\n6. Reporting: Document in incident log, notify authorities if required (Art. 62).\n7. Review: Update monitoring plan and risk assessment.` },
        reporting_and_escalation: { text: `Reporting structure:\n- Operators: Report issues immediately via incident form.\n- AI Governance Lead: Weekly summary to management.\n- Management: Monthly AI governance report.\n- Authorities: Serious incidents reported within 72 hours per Art. 62.\n\nEscalation path: Operator → Tool Owner → AI Governance Lead → DPO → Management.` },
        review_and_update: { text: `This monitoring plan is reviewed:\n- After every significant incident.\n- When the tool is updated or reconfigured.\n- When risk classification changes.\n- At minimum annually.\n\nUpdates are approved by the AI Governance Lead and documented in the compliance platform.` },
      }),

      employee_notification: () => ({
        notification_header: { text: `EMPLOYEE NOTIFICATION — Use of AI Systems in the Workplace\n\nDate: [INSERT DATE]\nOrganization: [ORGANIZATION NAME]\nDepartment: All departments using "${name}"\n\nDear colleagues,\n\nPursuant to Art. 26(7) of the EU AI Act, we inform you about the use of AI systems that may affect your work.` },
        ai_systems_description: { text: `AI System: ${name}\nVendor: ${vendor}\nPurpose: ${purpose}\nDomain: ${domainVal}\nRisk Classification: ${riskLevel}\nAutonomy Level: ${autonomyLevel}\nHuman Oversight: ${oversightStr}\n\nThis system processes the following data types: ${dataTypesStr}.` },
        purpose_and_impact: { text: `"${name}" is used for: ${purpose}.\n\nHow this affects your work:\n- The system provides ${autonomyLevel === 'autonomous' ? 'automated decisions' : autonomyLevel === 'semi_autonomous' ? 'recommendations that inform decisions' : 'advisory information'} in the ${domainVal} domain.\n- ${humanOversight ? 'All AI outputs are reviewed by a human before final decisions are made.' : 'Some outputs may be applied without human review.'}\n- Affected groups: ${personsStr}.` },
        employee_rights: { text: `Your rights regarding AI-assisted decisions:\n1. Right to be informed about AI use (this notification).\n2. Right to human review of significant AI-assisted decisions.\n3. Right to raise concerns with the AI Governance Lead.\n4. Right to request explanation of AI-assisted decisions.\n5. Right not to be subject to fully automated decisions with legal effects (per GDPR Art. 22).\n6. Right to lodge complaints with relevant authorities.` },
        contact_information: { text: `For questions about AI systems in the workplace:\n\nAI Governance Lead: [NAME, EMAIL]\nData Protection Officer: [NAME, EMAIL]\nWorks Council: [NAME, EMAIL]\n\nYou may raise concerns confidentially at any time.` },
      }),
    };

    const generator = generators[documentType];
    if (!generator) return sections.map((s) => ({ sectionCode: s.sectionCode, content: { text: '' } }));

    const contentMap = generator();
    return sections.map((s) => ({
      sectionCode: s.sectionCode,
      content: contentMap[s.sectionCode] || { text: '' },
    }));
  },
})
