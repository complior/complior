(() => {
  return {
    perform: async ({ answers, email, consent }) => {
      const assessment = domain.classification.services.QuickCheckAssessor.assess(answers);

      if (email && consent) {
        try {
          await brevo.sendTransactional({
            to: email,
            templateId: 'quick-check-results',
            params: {
              applies: assessment.applies,
              obligationCount: assessment.obligations.length,
              highRisk: assessment.highRiskAreas.length > 0,
            },
          });
        } catch (err) {
          console.error('Brevo lead capture failed:', err.message);
        }
      }

      return assessment;
    },
  };
})()
