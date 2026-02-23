[
  {
    access: 'public',
    httpMethod: 'GET',
    path: '/v1/registry/stats',
    method: async () => {
      return application.registry.registryStats.stats();
    },
  },
]
