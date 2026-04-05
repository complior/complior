/**
 * Maps scanner checkIds to obligation IDs they cover.
 * Single source of truth — used by obligations.route.ts and obligation-coverage builder.
 */
export const CHECK_TO_OBLIGATIONS: Readonly<Record<string, readonly string[]>> = {
  // L1 file-presence checks
  'ai-disclosure': ['OBL-013', 'OBL-052'],
  'content-marking': ['OBL-050', 'OBL-051'],
  'interaction-logging': ['OBL-006', 'OBL-006A'],
  'ai-literacy': ['OBL-001', 'OBL-001A'],
  'gpai-transparency': ['OBL-022', 'OBL-024'],
  'compliance-metadata': ['OBL-005'],
  'documentation': ['OBL-005', 'OBL-005A'],
  'passport-presence': ['OBL-049'],
  'passport-completeness': ['OBL-034'],
  // L2 document-structure checks
  'l2-tech-documentation': ['OBL-005', 'OBL-005A'],
  'l2-monitoring-policy': ['OBL-011', 'OBL-009'],
  'l2-fria': ['OBL-013'],
  'l2-ai-literacy': ['OBL-001'],
  'l2-art5-screening': ['OBL-002'],
  'l2-worker-notification': ['OBL-010A'],
  // L3 config/dependency checks
  'l3-ai-sdk-detected': ['OBL-005'],
  'l3-log-retention': ['OBL-006A'],
  'l3-ci-compliance': ['OBL-017'],
  'l3-missing-bias-testing': ['OBL-004A'],
  'l3-banned-emotion-recognition': ['OBL-002F'],
  // L4 AST pattern checks
  'l4-human-oversight': ['OBL-008', 'OBL-014'],
  'l4-kill-switch': ['OBL-008'],
  'l4-logging': ['OBL-006', 'OBL-012'],
  'l4-disclosure': ['OBL-013', 'OBL-052'],
  'l4-content-marking': ['OBL-050', 'OBL-051'],
  'l4-data-governance': ['OBL-004', 'OBL-010'],
  'l4-accuracy-robustness': ['OBL-007'],
  'l4-gpai-transparency': ['OBL-022', 'OBL-024'],
  'l4-deployer-monitoring': ['OBL-011'],
  'l4-record-keeping': ['OBL-012'],
  'l4-cybersecurity': ['OBL-015'],
  'l4-conformity-assessment': ['OBL-019'],
  'l4-security-risk': ['OBL-015'],
  'l4-bare-llm': ['OBL-052'],
  // Cross-layer checks
  'cross-banned-with-wrapper': ['OBL-002'],
  'cross-logging-no-retention': ['OBL-006A'],
  'cross-kill-switch-no-test': ['OBL-008'],
};

/** Build reverse mapping: obligation ID → check IDs. */
export const buildOblToChecks = (): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  for (const [checkId, oblIds] of Object.entries(CHECK_TO_OBLIGATIONS)) {
    for (const oblId of oblIds) {
      const existing = map.get(oblId) ?? [];
      existing.push(checkId);
      map.set(oblId, existing);
    }
  }
  return map;
};
