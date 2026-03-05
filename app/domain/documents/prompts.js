({
  buildPrompt: (tool, documentType, sectionCode, sectionTitle) => {
    const name = tool.name || 'the AI tool';
    const vendor = tool.vendorName || 'unknown vendor';
    const purpose = tool.purpose || 'not specified';
    const domainVal = tool.domain || 'other';
    const riskLevel = tool.riskLevel || 'unknown';
    const dataTypes = Array.isArray(tool.dataTypes) ? tool.dataTypes.join(', ') : 'not specified';
    const affectedPersons = Array.isArray(tool.affectedPersons) ? tool.affectedPersons.join(', ') : 'not specified';
    const autonomyLevel = tool.autonomyLevel || 'advisory';
    const humanOversight = tool.humanOversight !== false ? 'Yes' : 'No';

    const docTypeLabels = {
      usage_policy: 'AI Usage Policy',
      qms_template: 'Quality Management System (QMS) Template',
      risk_assessment: 'Risk Management Plan',
      monitoring_plan: 'Monitoring Plan',
      employee_notification: 'Worker Notification (Art. 26(7) EU AI Act)',
    };

    const docLabel = docTypeLabels[documentType] || documentType;

    const toolContext = [
      `Tool Name: ${name}`,
      `Vendor: ${vendor}`,
      `Purpose: ${purpose}`,
      `Domain: ${domainVal}`,
      `Risk Level: ${riskLevel}`,
      `Autonomy Level: ${autonomyLevel}`,
      `Human Oversight: ${humanOversight}`,
      `Data Types Processed: ${dataTypes}`,
      `Affected Persons: ${affectedPersons}`,
    ].join('\n');

    const systemPrompt = `You are an EU AI Act compliance expert. You are writing the "${sectionTitle}" section of a ${docLabel} for an AI tool deployed by a European organization.

Your output must be:
- Professional, precise, and legally sound
- Aligned with the EU AI Act (Regulation (EU) 2024/1689) requirements
- Specific to the tool described below — avoid generic boilerplate
- Written in clear English suitable for compliance documentation
- Structured with numbered lists or bullet points where appropriate

Do NOT include section headings or titles — just the section content.
Do NOT use markdown formatting — write plain text with line breaks.`;

    const userPrompt = `Write the "${sectionTitle}" section for the following AI tool:

${toolContext}

Document type: ${docLabel}

Write 2-4 paragraphs of substantive content specific to this tool and its risk profile. Reference relevant EU AI Act articles where applicable (e.g., Art. 6 for high-risk classification, Art. 9 for risk management, Art. 13 for transparency, Art. 14 for human oversight, Art. 26 for deployer obligations, Art. 4 for AI literacy).`;

    return { systemPrompt, userPrompt };
  },
})
