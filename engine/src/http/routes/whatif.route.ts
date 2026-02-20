import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import { analyzeScenario, type ScenarioType } from '../../domain/whatif/scenario-engine.js';
import { generateAllConfigs } from '../../domain/whatif/config-fixer.js';
import type { OnboardingProfile } from '../../onboarding/profile.js';
import type { ScoreBreakdown } from '../../types/common.types.js';

const WhatIfSchema = z.object({
  type: z.enum(['jurisdiction', 'tool', 'risk_level']),
  params: z.record(z.string()),
});

export interface WhatIfRouteDeps {
  readonly loadProfile: () => Promise<OnboardingProfile | null>;
  readonly getLastScore: () => ScoreBreakdown | null;
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

    const result = analyzeScenario({
      type: parsed.data.type as ScenarioType,
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

    const configs = generateAllConfigs(profile);
    return c.json({ configs });
  });

  return app;
};
