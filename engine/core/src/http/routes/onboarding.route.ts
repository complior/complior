import { Hono } from 'hono';
import { z } from 'zod';
import type { OnboardingWizard } from '../../onboarding/wizard.js';
import { parseBody } from '../utils/validation.js';
import { runInit } from '../../services/init-service.js';

const CompleteSchema = z.object({
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  /** V1-M09 T-4: When true, overwrites any existing profile. */
  reconfigure: z.boolean().optional().default(false),
});

export interface OnboardingRouteDeps {
  readonly wizard: OnboardingWizard;
  /** V1-M30 W-1: project path getter for evidence chain init */
  readonly getProjectPath: () => string;
}

export const createOnboardingRoute = (deps: OnboardingRouteDeps) => {
  const app = new Hono();

  // GET /onboarding/status — check if profile exists
  app.get('/onboarding/status', async (c) => {
    const has = await deps.wizard.hasProfile();
    const profile = has ? await deps.wizard.loadProfile() : null;
    return c.json({ hasProfile: has, profile });
  });

  // POST /onboarding/detect — auto-detect project info
  app.post('/onboarding/detect', async (c) => {
    const result = await deps.wizard.detect();
    return c.json(result);
  });

  // GET /onboarding/questions — get question blocks
  app.get('/onboarding/questions', (c) => {
    return c.json({ blocks: deps.wizard.getQuestions() });
  });

  // POST /onboarding/complete — submit answers + build profile + create evidence chain
  app.post('/onboarding/complete', async (c) => {
    const data = await parseBody(c, CompleteSchema);

    const result = await deps.wizard.complete(data.answers, data.reconfigure);

    // W-1: Also initialize evidence chain for this project (V1-M30)
    // runInit is idempotent — no-op if chain already exists and is valid
    await runInit({ projectPath: deps.getProjectPath() }).catch(() => { /* non-fatal */ });

    return c.json({
      profile: result.profile,
      autoDetected: result.autoDetected,
      profilePath: result.profilePath,
    });
  });

  // GET /onboarding/profile — load saved profile
  app.get('/onboarding/profile', async (c) => {
    const profile = await deps.wizard.loadProfile();
    if (!profile) {
      return c.json({ error: 'NO_PROFILE', message: 'No onboarding profile found. Run /onboarding/complete first.' }, 404);
    }
    return c.json(profile);
  });

  return app;
};