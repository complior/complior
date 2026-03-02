({
  access: 'public',
  httpMethod: 'GET',
  path: '/v1/regulations/meta',
  method: async ({ query }) => {
    const jurisdictionId = query.jurisdictionId || 'eu-ai-act';
    return application.regulations.getRegulationMeta.get({ jurisdictionId });
  },
})
