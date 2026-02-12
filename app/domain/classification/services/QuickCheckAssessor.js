(() => {
  const ANNEX_III_DOMAINS = new Set([
    'biometrics', 'critical_infrastructure', 'education', 'employment',
    'essential_services', 'law_enforcement', 'migration', 'justice',
  ]);

  /* eslint-disable camelcase */
  const ANNEX_CATEGORIES = {
    biometrics: 'Annex III, 1: Biometrics',
    critical_infrastructure: 'Annex III, 2: Critical Infrastructure',
    education: 'Annex III, 3: Education & Vocational Training',
    employment: 'Annex III, 4: Employment & Workers Management',
    essential_services: 'Annex III, 5: Essential Services',
    law_enforcement: 'Annex III, 6: Law Enforcement',
    migration: 'Annex III, 7: Migration, Asylum & Border Control',
    justice: 'Annex III, 8: Administration of Justice & Democracy',
  };
  /* eslint-enable camelcase */

  const HIGH_RISK_OBLIGATIONS = [
    'Risk Management System (Art. 9)',
    'Data Governance (Art. 10)',
    'Technical Documentation (Art. 11)',
    'Record-Keeping (Art. 12)',
    'Transparency & Information (Art. 13)',
    'Human Oversight (Art. 14)',
    'Accuracy, Robustness & Cybersecurity (Art. 15)',
  ];

  const assess = (answers) => {
    const { deploysAI, aiAffectsPersons, domain, aiMakesDecisions } = answers;

    const result = {
      applies: false,
      obligations: [],
      highRiskAreas: [],
      literacyRequired: false,
      findings: [],
    };

    // Art. 2 applicability
    if (!deploysAI) {
      result.findings.push({
        title: 'AI Act may not apply',
        description: 'Based on your answers, you may not be deploying or using AI systems covered by the EU AI Act.',
        article: 'Art. 2',
        severity: 'info',
      });
      return result;
    }

    result.applies = true;

    // Art. 4 literacy — always required if AI Act applies
    result.literacyRequired = true;
    result.obligations.push('AI Literacy (Art. 4)');
    result.findings.push({
      title: 'AI Literacy Required',
      description: 'All deployers of AI systems must ensure sufficient AI literacy among staff.',
      article: 'Art. 4',
      severity: 'medium',
    });

    // Annex III high-risk domain check
    const isHighRisk = ANNEX_III_DOMAINS.has(domain);
    if (isHighRisk) {
      result.highRiskAreas.push(ANNEX_CATEGORIES[domain]);
      result.findings.push({
        title: 'High-Risk Domain Identified',
        description: 'Your AI system operates in ' + ANNEX_CATEGORIES[domain] + ', which is listed as a high-risk area under the EU AI Act.',
        article: 'Art. 6(2)',
        severity: 'high',
      });
    }

    // Art. 50 transparency
    if (aiAffectsPersons) {
      result.obligations.push('Transparency Obligations (Art. 50)');
      result.findings.push({
        title: 'Transparency Obligations Apply',
        description: 'Your AI system affects natural persons and requires transparency measures, including informing users they are interacting with AI.',
        article: 'Art. 50',
        severity: 'medium',
      });
    }

    // Art. 6(2): high-risk domain + makes decisions → full obligations
    if (isHighRisk && aiMakesDecisions) {
      result.obligations.push(...HIGH_RISK_OBLIGATIONS);
      result.findings.push({
        title: 'Full High-Risk Compliance Required',
        description: 'Your AI system operates in a high-risk domain and makes or supports decisions. You must comply with the full set of high-risk AI system requirements.',
        article: 'Art. 6(2)',
        severity: 'critical',
      });
    } else if (isHighRisk) {
      result.findings.push({
        title: 'High-Risk Domain — Limited Decision-Making',
        description: 'Your AI system operates in a high-risk domain but does not make decisions. A full classification is recommended to determine applicable requirements.',
        article: 'Art. 6(2)',
        severity: 'high',
      });
    }

    return result;
  };

  return { assess };
})()
