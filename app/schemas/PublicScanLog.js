({
  Entity: {},

  // ── Rate limiting (core) ──
  ip: 'ip',
  normalizedEndpoint: { type: 'string', length: { max: 500 } },
  userId: { type: 'number', required: false },
  denied: { type: 'boolean', default: false },

  // ── Full request context ──
  url: { type: 'string', length: { max: 2000 } },
  mode: {
    enum: ['passive', 'det_security', 'full'],
    default: 'passive',
  },
  userAgent: { type: 'string', required: false },
  referrer: { type: 'string', required: false },

  // ── Scan outcome ──
  success: { type: 'boolean', required: false },
  slug: { type: 'string', length: { max: 200 }, required: false },
  isExistingTool: { type: 'boolean', required: false },
  grade: { type: 'string', length: { max: 5 }, required: false },
  score: { type: 'number', required: false },
  coverage: { type: 'number', required: false },
  durationMs: { type: 'number', required: false },
  errorCode: { type: 'string', length: { max: 100 }, required: false },

  // ── Conversion tracking ──
  questionsAnswered: { type: 'boolean', default: false },
  submittedToRegistry: { type: 'boolean', default: false },

  // ── Timestamps ──
  scannedAt: { type: 'datetime', default: 'now()' },
});
