import { Hono } from 'hono';
import { ValidationError } from '../../types/errors.js';
import type { OnboardingService } from '../../services/onboarding-service.js';
import { TOTAL_STEPS } from '../../domain/onboarding/guided-onboarding.js';

export interface GuidedOnboardingDeps {
  readonly onboardingService: OnboardingService;
}

const toProgress = (status: { steps: readonly { status: string }[]; totalSteps: number }) => {
  const completedSteps = status.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped',
  ).length;
  return {
    completedSteps,
    totalSteps: status.totalSteps,
    percentage: Math.round((completedSteps / status.totalSteps) * 100),
  };
};

export const createGuidedOnboardingRoute = (deps: GuidedOnboardingDeps) => {
  const app = new Hono();

  // POST /onboarding/guided/start — start or resume guided onboarding
  app.post('/onboarding/guided/start', async (c) => {
    const status = await deps.onboardingService.start();
    return c.json({ state: status, progress: toProgress(status) });
  });

  // GET /onboarding/guided/status — get current state
  app.get('/onboarding/guided/status', async (c) => {
    const status = await deps.onboardingService.getStatus();
    return c.json({ state: status, progress: toProgress(status) });
  });

  // POST /onboarding/guided/step/:n — execute step n
  app.post('/onboarding/guided/step/:n', async (c) => {
    const stepNum = parseInt(c.req.param('n'), 10);
    if (isNaN(stepNum) || stepNum < 1 || stepNum > TOTAL_STEPS) {
      throw new ValidationError(`Step must be between 1 and ${TOTAL_STEPS}`);
    }

    const result = await deps.onboardingService.advanceStep(stepNum);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    const status = await deps.onboardingService.getStatus();
    return c.json({
      step: result.step,
      data: result.data,
      state: status,
      progress: toProgress(status),
    });
  });

  // POST /onboarding/guided/reset — reset onboarding progress
  app.post('/onboarding/guided/reset', async (c) => {
    const status = await deps.onboardingService.reset();
    return c.json({ state: status, progress: { completedSteps: 0, totalSteps: status.totalSteps, percentage: 0 } });
  });

  return app;
};
