(() => {
  // Single source of truth: CLI obligation IDs → SaaS requirement codes
  // Only deployer-relevant obligations are mapped (32 of 108 total)
  const FORWARD_MAP = {
    'eu-ai-act-OBL-001': ['ART_4_LITERACY'],
    'eu-ai-act-OBL-001a': ['ART_4_TRAINING_CEO', 'ART_4_TRAINING_HR', 'ART_4_TRAINING_DEV', 'ART_4_TRAINING_GENERAL'],
    'eu-ai-act-OBL-002': ['ART_5_PROHIBITED'],
    'eu-ai-act-OBL-002c': ['ART_5_SOCIAL_SCORING'],
    'eu-ai-act-OBL-002e': ['ART_5_BIOMETRIC'],
    'eu-ai-act-OBL-006': ['ART_26_LOGS'],
    'eu-ai-act-OBL-008': ['ART_26_OVERSIGHT'],
    'eu-ai-act-OBL-009': ['ART_26_MONITORING'],
    'eu-ai-act-OBL-011': ['ART_26_USAGE'],
    'eu-ai-act-OBL-011b': ['ART_26_INPUT_DATA'],
    'eu-ai-act-OBL-011c': ['ART_26_CEASE'],
    'eu-ai-act-OBL-011d': ['ART_26_LOGS'],
    'eu-ai-act-OBL-012': ['ART_26_INFORM_WORKERS'],
    'eu-ai-act-OBL-013': ['ART_27_FRIA'],
    'eu-ai-act-OBL-013a': ['ART_27_AFFECTED_PERSONS'],
    'eu-ai-act-OBL-013b': ['ART_27_SPECIFIC_RISKS'],
    'eu-ai-act-OBL-013c': ['ART_27_OVERSIGHT_MEASURES'],
    'eu-ai-act-OBL-013d': ['ART_27_MITIGATION'],
    'eu-ai-act-OBL-014': ['ART_26_REGISTRATION'],
    'eu-ai-act-OBL-015': ['ART_50_CHATBOT'],
    'eu-ai-act-OBL-016': ['ART_50_DEEPFAKE'],
    'eu-ai-act-OBL-017': ['ART_50_EMOTION'],
    'eu-ai-act-OBL-018': ['ART_50_DEEPFAKE'],
    'eu-ai-act-OBL-024': ['ART_50_TRANSPARENCY'],
    'eu-ai-act-OBL-025': ['ART_26_COOPERATION'],
    'eu-ai-act-OBL-029': ['ART_26_RISK_MGMT_SUPPORT'],
    'eu-ai-act-OBL-031': ['ART_26_INCIDENT'],
  };

  // Derive reverse map: requirement code → obligation IDs
  const REVERSE_MAP = Object.entries(FORWARD_MAP).reduce((acc, [oblId, codes]) => {
    codes.forEach((code) => { acc[code] = [...(acc[code] || []), oblId]; });
    return acc;
  }, {});

  return {
    resolveRequirements: (obligationId) => FORWARD_MAP[obligationId] || [],
    resolveObligations: (requirementCode) => REVERSE_MAP[requirementCode] || [],
  };
})()
