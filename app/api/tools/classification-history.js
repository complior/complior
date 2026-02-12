[
  {
    access: 'authenticated',
    httpMethod: 'GET',
    path: '/api/tools/:id/classification-history',
    method: async ({ params, session }) => {
      if (!session) throw new errors.AuthError();
      const user = await application.iam.resolveSession.resolveUser(session);
      await lib.permissions.checkPermission(user, 'AITool', 'read');

      let parsed;
      try {
        parsed = schemas.ToolIdSchema.parse(params);
      } catch (err) {
        if (err.flatten) {
          throw new errors.ValidationError('Invalid tool ID', err.flatten().fieldErrors);
        }
        throw err;
      }

      return application.classification.getClassificationHistory.getHistory({
        toolId: parsed.id,
        organizationId: user.organizationId,
      });
    },
  },
]
