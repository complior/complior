({
  access: 'public',
  httpMethod: 'GET',
  path: '/v1/regulations/scoring',
  method: async ({ query }) => {
    const jurisdictionId = query.jurisdictionId || 'eu-ai-act';
    return application.regulations.getScoringRules.get({ jurisdictionId });
  },
})
