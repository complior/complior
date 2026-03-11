import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { WhatIfRequest, WhatIfResult } from '../../domain/whatif/scenario-engine.js';
import type { GeneratedConfig } from '../../domain/whatif/config-fixer.js';
import type { SimulationInput, SimulationResult } from '../../domain/whatif/simulate-actions.js';
import type { OnboardingProfile } from '../../onboarding/profile.js';
import type { ScanResult, ScoreBreakdown } from '../../types/common.types.js';

const WhatIfSchema = z.object({
  type: z.enum(['jurisdiction', 'tool', 'risk_level']),
  params: z.record(z.string()),
});

const SimulateActionSchema = z.object({
  type: z.enum(['fix', 'add-doc', 'complete-passport']),
  target: z.string(),
});

const SimulateSchema = z.object({
  actions: z.array(SimulateActionSchema).min(1),
  passportCompleteness: z.number().min(0).max(100).optional(),
});

export interface WhatIfRouteDeps {
  readonly loadProfile: () => Promise<OnboardingProfile | null>;
  readonly getLastScore: () => ScoreBreakdown | null;
  readonly getLastScan?: () => ScanResult | null;
  readonly analyzeScenario: (request: WhatIfRequest) => WhatIfResult;
  readonly generateAllConfigs: (profile: OnboardingProfile) => readonly GeneratedConfig[];
  readonly simulateActions: (input: SimulationInput) => SimulationResult;
}

export const createWhatIfRoute = (deps: WhatIfRouteDeps) => {
  const app = new Hono();

  // POST /whatif — analyze a what-if scenario
  app.post('/whatif', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = WhatIfSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const profile = await deps.loadProfile();
    if (!profile) {
      return c.json({ error: 'NO_PROFILE', message: 'Run onboarding first (/onboarding/complete)' }, 400);
    }

    const score = deps.getLastScore();
    if (!score) {
      return c.json({ error: 'NO_SCAN', message: 'Run a scan first (/scan)' }, 400);
    }

    const result = deps.analyzeScenario({
      type: parsed.data.type,
      params: parsed.data.params,
      currentProfile: profile,
      currentScore: score,
    });

    return c.json(result);
  });

  // POST /whatif/config — generate compliance configs from profile
  app.post('/whatif/config', async (c) => {
    const profile = await deps.loadProfile();
    if (!profile) {
      return c.json({ error: 'NO_PROFILE', message: 'Run onboarding first (/onboarding/complete)' }, 400);
    }

    const configs = deps.generateAllConfigs(profile);
    return c.json({ configs });
  });

  // POST /simulate — US-S05-25: batch compliance simulation (what-if for fixes/docs/passport)
  app.post('/simulate', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = SimulateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const scanResult = deps.getLastScan?.();
    if (!scanResult) {
      return c.json({ error: 'NO_SCAN', message: 'No scan results available. Run a scan first.' }, 400);
    }

    const result = deps.simulateActions({
      actions: parsed.data.actions,
      currentScore: scanResult.score.totalScore,
      findings: scanResult.findings.map((f) => ({
        checkId: f.checkId,
        severity: f.severity,
        status: f.type ?? 'fail',
      })),
      passportCompleteness: parsed.data.passportCompleteness ?? 50,
    });

    return c.json(result);
  });

  return app;
};
