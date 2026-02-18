// --- 5-Tier Confidence Levels ---

export type ConfidenceLevel = 'PASS' | 'LIKELY_PASS' | 'UNCERTAIN' | 'LIKELY_FAIL' | 'FAIL';

export type ScannerLayer = 'L1' | 'L2' | 'L3' | 'L4';

export interface CheckWithConfidence {
  readonly layer: ScannerLayer;
  readonly confidence: number; // 0-100
  readonly level: ConfidenceLevel;
  readonly obligationId?: string;
}

// --- Layer Weights ---

const LAYER_WEIGHTS: Readonly<Record<ScannerLayer, number>> = {
  L1: 1.0,
  L2: 0.95,
  L3: 0.85,
  L4: 0.7,
};

// --- Confidence Level Determination ---

export const getConfidenceLevel = (confidence: number, isPass: boolean): ConfidenceLevel => {
  if (isPass) {
    if (confidence >= 95) return 'PASS';
    if (confidence >= 70) return 'LIKELY_PASS';
    return 'UNCERTAIN';
  }

  // Fail direction
  if (confidence >= 95) return 'FAIL';
  if (confidence >= 70) return 'LIKELY_FAIL';
  return 'UNCERTAIN';
};

// --- Per-Layer Confidence Assignment ---

// L1: File presence (deterministic, high confidence)
export const l1Confidence = (found: boolean): CheckWithConfidence => ({
  layer: 'L1',
  confidence: found ? 95 : 98,
  level: found ? 'PASS' : 'FAIL',
});

// L2: Document structure (deterministic, high confidence)
export const l2Confidence = (status: 'VALID' | 'PARTIAL' | 'EMPTY'): CheckWithConfidence => {
  switch (status) {
    case 'VALID':
      return { layer: 'L2', confidence: 95, level: 'PASS' };
    case 'PARTIAL':
      return { layer: 'L2', confidence: 75, level: 'LIKELY_PASS' };
    case 'EMPTY':
      return { layer: 'L2', confidence: 95, level: 'FAIL' };
  }
};

// L3: Config analysis (medium-high confidence)
export const l3Confidence = (status: 'OK' | 'WARNING' | 'FAIL' | 'PROHIBITED'): CheckWithConfidence => {
  switch (status) {
    case 'OK':
      return { layer: 'L3', confidence: 80, level: 'LIKELY_PASS' };
    case 'WARNING':
      return { layer: 'L3', confidence: 80, level: 'LIKELY_FAIL' };
    case 'FAIL':
      return { layer: 'L3', confidence: 80, level: 'LIKELY_FAIL' };
    case 'PROHIBITED':
      return { layer: 'L3', confidence: 99, level: 'FAIL' };
  }
};

// L4: Pattern matching (heuristic, medium confidence)
export const l4Confidence = (
  patternType: 'positive' | 'negative',
  status: 'FOUND' | 'NOT_FOUND',
): CheckWithConfidence => {
  if (patternType === 'negative' && status === 'FOUND') {
    return { layer: 'L4', confidence: 80, level: 'LIKELY_FAIL' };
  }
  if (patternType === 'positive' && status === 'FOUND') {
    return { layer: 'L4', confidence: 75, level: 'LIKELY_PASS' };
  }
  if (patternType === 'positive' && status === 'NOT_FOUND') {
    return { layer: 'L4', confidence: 80, level: 'LIKELY_FAIL' };
  }
  // negative NOT_FOUND → good (absence of bad)
  return { layer: 'L4', confidence: 70, level: 'LIKELY_PASS' };
};

// --- Aggregation ---

export const aggregateConfidence = (checks: readonly CheckWithConfidence[]): number => {
  if (checks.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const check of checks) {
    const weight = LAYER_WEIGHTS[check.layer];
    totalWeight += weight;
    weightedSum += check.confidence * weight;
  }

  return totalWeight === 0 ? 0 : Math.round((weightedSum / totalWeight) * 100) / 100;
};

export const aggregateLevel = (checks: readonly CheckWithConfidence[]): ConfidenceLevel => {
  if (checks.length === 0) return 'UNCERTAIN';

  const confidence = aggregateConfidence(checks);

  // Determine direction: majority of checks
  const passDirection = checks.filter((c) =>
    c.level === 'PASS' || c.level === 'LIKELY_PASS',
  ).length;
  const failDirection = checks.filter((c) =>
    c.level === 'FAIL' || c.level === 'LIKELY_FAIL',
  ).length;

  // If contradictory signals → UNCERTAIN
  if (passDirection > 0 && failDirection > 0) {
    // Check if one side is clearly dominant
    const ratio = Math.max(passDirection, failDirection) / checks.length;
    if (ratio < 0.7) return 'UNCERTAIN';
  }

  const isPass = passDirection >= failDirection;
  return getConfidenceLevel(confidence, isPass);
};

// --- Score Impact ---

const CONFIDENCE_SCORE_MULTIPLIER: Readonly<Record<ConfidenceLevel, number>> = {
  PASS: 1.0,
  LIKELY_PASS: 0.75,
  UNCERTAIN: 0.5,
  LIKELY_FAIL: 0.25,
  FAIL: 0.0,
};

export const confidenceScoreMultiplier = (level: ConfidenceLevel): number =>
  CONFIDENCE_SCORE_MULTIPLIER[level];

// --- Summary ---

export interface ConfidenceSummary {
  readonly pass: number;
  readonly likelyPass: number;
  readonly uncertain: number;
  readonly likelyFail: number;
  readonly fail: number;
  readonly total: number;
}

export const summarizeConfidence = (checks: readonly CheckWithConfidence[]): ConfidenceSummary => ({
  pass: checks.filter((c) => c.level === 'PASS').length,
  likelyPass: checks.filter((c) => c.level === 'LIKELY_PASS').length,
  uncertain: checks.filter((c) => c.level === 'UNCERTAIN').length,
  likelyFail: checks.filter((c) => c.level === 'LIKELY_FAIL').length,
  fail: checks.filter((c) => c.level === 'FAIL').length,
  total: checks.length,
});
