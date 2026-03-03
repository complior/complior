({
  generate: (tool) => {
    const name = tool.name || '';
    const vendor = tool.vendorName || '';
    const purpose = tool.purpose || '';
    const domain = tool.domain || 'other';
    const dataTypes = tool.dataTypes || [];
    const affectedPersons = tool.affectedPersons || [];
    const vulnerableGroups = tool.vulnerableGroups || false;
    const autonomyLevel = tool.autonomyLevel || 'advisory';
    const humanOversight = tool.humanOversight || false;

    return [
      {
        sectionType: 'general_info',
        sortOrder: 0,
        content: {
          toolName: name,
          vendor,
          purpose,
          domain,
          deploymentDate: '',
          riskLevel: tool.riskLevel || '',
        },
      },
      {
        sectionType: 'affected_persons',
        sortOrder: 1,
        content: {
          categories: affectedPersons,
          vulnerableGroups,
          estimatedCount: '',
          description: '',
        },
      },
      {
        sectionType: 'specific_risks',
        sortOrder: 2,
        content: {
          risks: dataTypes.length > 0 || domain !== 'other'
            ? [{
              category: domain,
              description: '',
              severity: 'medium',
              likelihood: 'medium',
            }]
            : [],
        },
      },
      {
        sectionType: 'human_oversight',
        sortOrder: 3,
        content: {
          hasHumanOversight: humanOversight,
          oversightType: autonomyLevel === 'autonomous'
            ? 'post_hoc'
            : autonomyLevel === 'semi_autonomous'
              ? 'concurrent'
              : 'pre_decision',
          responsibleRole: '',
          escalationProcess: '',
        },
      },
      {
        sectionType: 'mitigation_measures',
        sortOrder: 4,
        content: {
          measures: [],
        },
      },
      {
        sectionType: 'monitoring_plan',
        sortOrder: 5,
        content: {
          frequency: '',
          metrics: [],
          responsibleTeam: '',
          reviewProcess: '',
        },
      },
    ];
  },
})
