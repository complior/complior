({
  Relation: {},

  role: { type: 'Role', delete: 'cascade' },
  resource: { type: 'string', note: 'Entity/module name' },
  action: {
    enum: ['read', 'create', 'update', 'delete', 'manage'],
    default: 'read',
  },
  naturalKey: { unique: ['role', 'resource', 'action'] },
});
