(() => {
  return {
    perform: async ({ answers }) => {
      return domain.classification.services.QuickCheckAssessor.assess(answers);
    },
  };
})()
