[
  {
    access: 'authenticated',
    httpMethod: 'GET',
    path: '/api/tools/:id/requirements',
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

      return application.classification.getRequirements.getByTool({
        toolId: parsed.id,
        organizationId: user.organizationId,
      });
    },
  },
  {
    access: 'authenticated',
    httpMethod: 'PATCH',
    path: '/api/tools/:id/requirements/:requirementId',
    method: async ({ params, body, session }) => {
      if (!session) throw new errors.AuthError();
      const user = await application.iam.resolveSession.resolveUser(session);
      await lib.permissions.checkPermission(user, 'AITool', 'update');

      let toolParsed;
      try {
        toolParsed = schemas.ToolIdSchema.parse({ id: params.id });
      } catch (err) {
        if (err.flatten) {
          throw new errors.ValidationError('Invalid tool ID', err.flatten().fieldErrors);
        }
        throw err;
      }

      const reqId = Number(params.requirementId);
      if (!Number.isInteger(reqId) || reqId <= 0) {
        throw new errors.ValidationError('Invalid requirement ID', {
          requirementId: ['Must be a positive integer'],
        });
      }

      let data;
      try {
        data = schemas.RequirementUpdateSchema.parse(body || {});
      } catch (err) {
        if (err.flatten) {
          throw new errors.ValidationError('Invalid update data', err.flatten().fieldErrors);
        }
        throw err;
      }

      return application.classification.updateRequirement.update({
        toolId: toolParsed.id,
        requirementId: reqId,
        userId: user.id,
        organizationId: user.organizationId,
        data,
      });
    },
  },
]
