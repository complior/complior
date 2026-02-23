({
  Registry: {},

  organization: { type: 'Organization', delete: 'cascade' },
  workosUserId: {
    type: 'string', unique: true, index: true,
    note: 'WorkOS user ID',
  },
  email: {
    type: 'string', length: { min: 6, max: 255 },
    unique: true, index: true,
  },
  fullName: { type: 'string', length: { max: 255 } },
  active: { type: 'boolean', default: true },
  locale: { type: 'string', length: { max: 5 }, default: '\'en\'' },
  roles: { many: 'Role' },
  lastLoginAt: { type: 'datetime', required: false },
});
