'use strict';

const { AuthError, ForbiddenError, ValidationError, NotFoundError } = require('../../lib/errors.js');

const VALID_INDUSTRIES = [
  'fintech', 'hrtech', 'healthtech', 'edtech', 'ecommerce',
  'manufacturing', 'logistics', 'legal', 'insurance', 'other',
];
const VALID_SIZES = ['micro_1_9', 'small_10_49', 'medium_50_249', 'large_250_plus'];

const createUpdateOrganizationHandler = (db, sessionResolver, checkPermission) => {
  const handler = async (request) => {
    if (!request.session) throw new AuthError();

    const user = await sessionResolver.resolveUser(request.session);
    if (!user) throw new AuthError('User not found');

    await checkPermission(user, 'Organization', 'update');

    const orgId = parseInt(request.params.id, 10);
    if (orgId !== user.organizationId) {
      throw new ForbiddenError('Cannot update another organization');
    }

    const { name, industry, size, country, website, vatId } = request.body || {};

    const errors = {};
    if (name !== undefined && (!name || name.length > 255)) {
      errors.name = 'Must be 1-255 characters';
    }
    if (industry !== undefined && !VALID_INDUSTRIES.includes(industry)) {
      errors.industry = `Must be one of: ${VALID_INDUSTRIES.join(', ')}`;
    }
    if (size !== undefined && !VALID_SIZES.includes(size)) {
      errors.size = `Must be one of: ${VALID_SIZES.join(', ')}`;
    }
    if (country !== undefined && (typeof country !== 'string' || country.length !== 2)) {
      errors.country = 'Must be ISO 3166-1 alpha-2 code';
    }
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Invalid organization data', errors);
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

    addField('name', name);
    addField('industry', industry);
    addField('size', size);
    addField('country', country);
    addField('website', website);
    addField('vatId', vatId);

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
