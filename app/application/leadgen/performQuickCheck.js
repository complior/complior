(() => {
  return {
    perform: async ({ answers, email, consent }) => {
      const assessment = domain.classification.services.QuickCheckAssessor.assess(answers);

      if (email && consent) {
        try {
          await application.leadgen.captureLead.perform({
            email,
            source: 'quick_check',
            metadata: {
              applies: assessment.applies,
              obligationCount: assessment.obligations.length,
              highRisk: assessment.highRiskAreas.length > 0,
            },
          });
        } catch (err) {
          console.error('Lead capture in quick check failed:', err.message);
        }
      }

      return assessment;
    },
  };
})()
