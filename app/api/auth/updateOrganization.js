'use strict';

const { z } = require('zod');
const { AuthError, ForbiddenError, ValidationError, NotFoundError } = require('../../lib/errors.js');
const { UpdateOrganizationSchema } = require('../../lib/schemas.js');

const createUpdateOrganizationHandler = (db, sessionResolver, checkPermission) => {
  const handler = async (request) => {
    if (!request.session) throw new AuthError();

    const user = await sessionResolver.resolveUser(request.session);
    if (!user) throw new AuthError('User not found');

    await checkPermission(user, 'Organization', 'update');

    const orgId = parseInt(request.params.id, 10);
    if (orgId !== Number(user.organizationId)) {
      throw new ForbiddenError('Cannot update another organization');
    }

    let validated;
    try {
      validated = UpdateOrganizationSchema.parse(request.body || {});
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError('Invalid organization data', err.flatten().fieldErrors);
      }
      throw err;
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const addField = (col, val) => {
      if (val !== undefined) {
        fields.push(`"${col}" = $${idx++}`);
        values.push(val);
      }
    };

    addField('name', validated.name);
    addField('industry', validated.industry);
    addField('size', validated.size);
    addField('country', validated.country);
    addField('website', validated.website);
    addField('vatId', validated.vatId);

    if (fields.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(orgId);
    const result = await db.query(
      `UPDATE "Organization" SET ${fields.join(', ')} WHERE "id" = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Organization', orgId);
    }

    return result.rows[0];
  };

  return {
    method: 'PATCH',
    path: '/api/organizations/:id',
    handler,
  };
};

module.exports = createUpdateOrganizationHandler;
