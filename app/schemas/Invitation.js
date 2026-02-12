({
  Entity: {},

  organization: { type: 'Organization', delete: 'cascade' },
  invitedBy: { type: 'User', delete: 'restrict' },
  email: { type: 'string', length: { min: 6, max: 255 } },
  role: {
    enum: ['admin', 'member', 'viewer'],
    default: 'member',
  },
  token: { type: 'string', unique: true },
  status: {
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending',
  },
  expiresAt: 'datetime',
  acceptedAt: { type: 'datetime', required: false },
  acceptedBy: { type: 'User', required: false, delete: 'restrict' },
  createdAt: { type: 'datetime', default: 'now()' },
});
