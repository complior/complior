({
  datetime: {
    js: 'string',
    metadata: { pg: 'timestamp with time zone' },
  },
  json: { metadata: { pg: 'jsonb' } },
  ip: { js: 'string', metadata: { pg: 'inet' } },
  riskLevel: {
    js: 'string',
    metadata: {
      pg: "varchar CHECK (value IN ('prohibited','high','gpai','limited','minimal'))",
    },
  },
  complianceStatus: {
    js: 'string',
    metadata: {
      pg: "varchar CHECK (value IN ('not_started','in_progress','review','compliant','non_compliant'))",
    },
  },
});
