import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { OnboardingWizard } from '../../onboarding/wizard.js';

const CompleteSchema = z.object({
  answers: z.record(z.union([z.string(), z.array(z.string())])),
});

export const createOnboardingRoute = (wizard: OnboardingWizard) => {
  const app = new Hono();

  // GET /onboarding/status — check if profile exists
  app.get('/onboarding/status', async (c) => {
    const has = await wizard.hasProfile();
    const profile = has ? await wizard.loadProfile() : null;
    return c.json({ hasProfile: has, profile });
  });

  // POST /onboarding/detect — auto-detect project info
  app.post('/onboarding/detect', async (c) => {
    const result = await wizard.detect();
    return c.json(result);
  });

  // GET /onboarding/questions — get question blocks
  app.get('/onboarding/questions', (c) => {
    return c.json({ blocks: wizard.getQuestions() });
  });

  // POST /onboarding/complete — submit answers + build profile
  app.post('/onboarding/complete', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = CompleteSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await wizard.complete(parsed.data.answers);
    return c.json({
      profile: result.profile,
      autoDetected: result.autoDetected,
      profilePath: result.profilePath,
    });
  });

  // GET /onboarding/profile — load saved profile
  app.get('/onboarding/profile', async (c) => {
    const profile = await wizard.loadProfile();
    if (!profile) {
      return c.json({ error: 'NO_PROFILE', message: 'No onboarding profile found. Run /onboarding/complete first.' }, 404);
    }
    return c.json(profile);
  });

  return app;
};
