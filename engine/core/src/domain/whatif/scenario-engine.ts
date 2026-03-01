import type { OnboardingProfile } from '../../onboarding/profile.js';
import type { ScoreBreakdown } from '../../types/common.types.js';

export type ScenarioType = 'jurisdiction' | 'tool' | 'risk_level';

export interface WhatIfRequest {
  readonly type: ScenarioType;
  readonly params: Record<string, string>;
  readonly currentProfile: OnboardingProfile;
  readonly currentScore: ScoreBreakdown;
}

export interface WhatIfResult {
  readonly scenario: string;
  readonly scoreDelta: number;
  readonly projectedScore: number;
  readonly newObligations: readonly string[];
  readonly removedObligations: readonly string[];
  readonly effort: {
    readonly estimatedWeeks: number;
    readonly keyTasks: readonly string[];
  };
  readonly recommendation: string;
}

const JURISDICTION_OBLIGATIONS: Record<string, { count: number; names: readonly string[] }> = {
  UK: { count: 17, names: ['UK AI Safety registration', 'DSIT transparency guidance', 'Post-market monitoring (UK)'] },
  US: { count: 8, names: ['State-level disclosure', 'FTC AI guidelines', 'Algorithmic accountability'] },
  'US-CO': { count: 5, names: ['Colorado SB 205 disclosure', 'High-risk AI notice', 'Impact assessment'] },
  'US-TX': { count: 4, names: ['Texas TRAIGA disclosure', 'AI inventory', 'Consumer notification'] },
  KR: { count: 6, names: ['Korea AI Basic Act registration', 'Disclosure requirements', 'Risk assessment'] },
};

const TOOL_IMPACTS: Record<string, { scoreDelta: number; obligations: readonly string[] }> = {
  whisper: { scoreDelta: -5, obligations: ['Audio data retention', 'Consent for audio', 'Transcription accuracy'] },
  'dall-e': { scoreDelta: -8, obligations: ['Art. 50.2 content marking', 'C2PA metadata', 'Deepfake labeling'] },
  elevenlabs: { scoreDelta: -10, obligations: ['Art. 50.4 deepfake disclosure', 'Voice cloning consent', 'Content marking'] },
  stable_diffusion: { scoreDelta: -7, obligations: ['Content marking', 'Model card', 'GPAI transparency'] },
  midjourney: { scoreDelta: -6, obligations: ['Art. 50.2 image marking', 'Watermark', 'Provenance metadata'] },
};

const RISK_LEVEL_CHANGES: Record<string, { scoreDelta: number; addedObligations: number; keyChanges: readonly string[] }> = {
  'limited_to_high': { scoreDelta: -20, addedObligations: 25, keyChanges: ['Conformity assessment required', 'FRIA mandatory', 'Bias testing', 'QMS documentation', 'Post-market monitoring'] },
  'minimal_to_limited': { scoreDelta: -10, addedObligations: 12, keyChanges: ['Art. 50 transparency', 'Disclosure to users', 'Content marking'] },
  'high_to_limited': { scoreDelta: 15, addedObligations: -20, keyChanges: ['Conformity assessment no longer required', 'Reduced documentation', 'Simplified monitoring'] },
  'limited_to_minimal': { scoreDelta: 8, addedObligations: -10, keyChanges: ['Minimal obligations only', 'No disclosure required'] },
};

export const analyzeScenario = (request: WhatIfRequest): WhatIfResult => {
  const { type, params, currentProfile, currentScore } = request;
  const baseScore = currentScore.totalScore;

  if (type === 'jurisdiction') {
    const newJurisdiction = params['jurisdiction'] ?? 'UK';
    const impact = JURISDICTION_OBLIGATIONS[newJurisdiction] ?? { count: 5, names: ['Additional local requirements'] };
    const scoreDelta = -Math.round(impact.count * 0.8);

    return {
      scenario: `Jurisdiction expansion: ${currentProfile.jurisdiction.primary} → ${currentProfile.jurisdiction.primary} + ${newJurisdiction}`,
      scoreDelta,
      projectedScore: Math.max(0, baseScore + scoreDelta),
      newObligations: impact.names,
      removedObligations: [],
      effort: {
        estimatedWeeks: Math.ceil(impact.count / 5),
        keyTasks: impact.names.slice(0, 3),
      },
      recommendation: `Adding ${newJurisdiction} jurisdiction adds ~${impact.count} obligations. Estimated ${Math.ceil(impact.count / 5)} weeks for compliance.`,
    };
  }

  if (type === 'tool') {
    const toolName = params['tool']?.toLowerCase() ?? '';
    const impact = TOOL_IMPACTS[toolName] ?? { scoreDelta: -3, obligations: ['Review compliance requirements for new tool'] };

    return {
      scenario: `Add AI tool: ${params['tool'] ?? 'unknown'}`,
      scoreDelta: impact.scoreDelta,
      projectedScore: Math.max(0, baseScore + impact.scoreDelta),
      newObligations: impact.obligations,
      removedObligations: [],
      effort: {
        estimatedWeeks: Math.ceil(impact.obligations.length / 2),
        keyTasks: impact.obligations.slice(0, 3),
      },
      recommendation: `Adding ${params['tool'] ?? 'this tool'} requires ${impact.obligations.length} additional compliance measures.`,
    };
  }

  if (type === 'risk_level') {
    const from = currentProfile.computed.riskLevel;
    const to = params['level'] ?? 'high';
    const key = `${from}_to_${to}`;
    const impact = RISK_LEVEL_CHANGES[key] ?? { scoreDelta: -10, addedObligations: 10, keyChanges: ['Review all obligations for new risk level'] };

    return {
      scenario: `Risk level change: ${from} → ${to}`,
      scoreDelta: impact.scoreDelta,
      projectedScore: Math.max(0, Math.min(100, baseScore + impact.scoreDelta)),
      newObligations: impact.keyChanges.filter((_, i) => impact.addedObligations > 0 ? true : i >= Math.abs(impact.addedObligations)),
      removedObligations: impact.addedObligations < 0 ? impact.keyChanges.slice(0, Math.abs(impact.addedObligations)) : [],
      effort: {
        estimatedWeeks: Math.abs(impact.addedObligations) > 15 ? 6 : 3,
        keyTasks: impact.keyChanges.slice(0, 3),
      },
      recommendation: impact.scoreDelta < 0
        ? `Upgrading to ${to} risk adds ${Math.abs(impact.addedObligations)} obligations. Score impact: ${impact.scoreDelta} points.`
        : `Downgrading to ${to} risk removes ${Math.abs(impact.addedObligations)} obligations. Score improvement: +${impact.scoreDelta} points.`,
    };
  }

  return {
    scenario: 'Unknown scenario type',
    scoreDelta: 0,
    projectedScore: baseScore,
    newObligations: [],
    removedObligations: [],
    effort: { estimatedWeeks: 0, keyTasks: [] },
    recommendation: 'Unknown scenario type. Use "jurisdiction", "tool", or "risk_level".',
  };
};
