({
  Relation: {},

  user: { type: 'User', delete: 'cascade' },
  role: { type: 'Role', delete: 'cascade' },
  naturalKey: { unique: ['user', 'role'] },
});
