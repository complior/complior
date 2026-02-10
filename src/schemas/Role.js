({
  Entity: {},

  name: { type: 'string', unique: true },
  active: { type: 'boolean', default: true },
  organizationId: { type: 'Organization', delete: 'cascade', required: false,
    note: 'NULL = system role, non-null = org-specific role' },
});
