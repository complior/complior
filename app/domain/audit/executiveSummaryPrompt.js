({
  build: (orgName, tools, riskDistribution, complianceScore, requirementSummary) => {
    const systemPrompt = 'You are an EU AI Act compliance expert. Generate a concise executive summary for an audit package. Use formal, regulatory language suitable for official documentation. Write in English. Keep it under 500 words.';

    const toolLines = tools
      .map((t) => `- ${t.name} (${t.vendorName || 'Unknown vendor'}): Risk Level ${t.riskLevel || 'unclassified'}, Compliance ${t.complianceScore ?? 0}%`)
      .join('\n');

    const userPrompt = `Generate an Executive Summary for ${orgName}'s AI Act Compliance Audit Package.

Organization: ${orgName}
Total AI Tools: ${tools.length}
Risk Distribution: ${JSON.stringify(riskDistribution)}
Overall Compliance Score: ${complianceScore}%

AI Tool Inventory:
${toolLines}

Requirement Status Summary:
${requirementSummary}

Structure the summary with:
1. Organization Overview
2. AI System Portfolio (risk breakdown)
3. Compliance Status (overall score, key achievements)
4. Key Findings & Gaps
5. Recommended Next Steps`;

    return { systemPrompt, userPrompt };
  },
})
