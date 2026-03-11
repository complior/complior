import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { ScanService } from '../../services/scan-service.js';
import type { PassportService } from '../../services/passport-service.js';
import type { ScanResult } from '../../types/common.types.js';
import { compareSeverity } from '../../types/common.types.js';
import { autoDetect } from '../../onboarding/auto-detect.js';
import {
  createInitialState,
  startOnboarding,
  completeStep,
  canRunStep,
  getProgress,
} from '../../domain/onboarding/guided-onboarding.js';
import type { GuidedOnboardingState } from '../../domain/onboarding/guided-onboarding.js';

export interface GuidedOnboardingDeps {
  readonly scanService: ScanService;
  readonly passportService: PassportService;
  readonly getProjectPath: () => string;
  readonly getLastScan: () => ScanResult | null;
  readonly loadOnboardingState: (projectPath: string) => Promise<GuidedOnboardingState>;
  readonly saveOnboardingState: (projectPath: string, state: GuidedOnboardingState) => Promise<void>;
}

const RequestSchema = z.object({
  path: z.string().min(1).optional(),
});

const resolveProjectPath = (body: unknown, fallback: () => string): string => {
  const parsed = RequestSchema.safeParse(body);
  return parsed.success && parsed.data.path ? parsed.data.path : fallback();
};

const executeStep = async (
  stepNum: number,
  deps: GuidedOnboardingDeps,
  projectPath: string,
): Promise<Record<string, unknown>> => {
  switch (stepNum) {
    case 1: {
      const detection = await autoDetect(projectPath);
      return { ...detection };
    }

    case 2: {
      const scanResult = await deps.scanService.scan(projectPath);
      const topFindings = scanResult.findings
        .filter((f) => f.type === 'fail')
        .sort((a, b) => compareSeverity(a.severity, b.severity))
        .slice(0, 5);
      return {
        score: scanResult.score.totalScore,
        filesScanned: scanResult.filesScanned,
        totalFindings: scanResult.findings.filter((f) => f.type === 'fail').length,
        topFindings: topFindings.map((f) => ({
          checkId: f.checkId,
          message: f.message,
          severity: f.severity,
        })),
      };
    }

    case 3: {
      const result = await deps.passportService.initPassport(projectPath);
      return {
        agentsFound: result.manifests.length,
        agents: result.manifests.map((m) => ({
          name: m.name,
          type: m.type,
          autonomyLevel: m.autonomy_level,
        })),
        savedPaths: result.savedPaths,
        skipped: result.skipped,
      };
    }

    case 4: {
      const scanResult = deps.getLastScan();
      if (!scanResult) {
        return { fixes: [], message: 'No scan result available. Run step 2 first.' };
      }
      const fixSuggestions = scanResult.findings
        .filter((f) => f.type === 'fail' && f.fixDiff)
        .sort((a, b) => compareSeverity(a.severity, b.severity))
        .slice(0, 3)
        .map((f) => ({
          checkId: f.checkId,
          message: f.message,
          severity: f.severity,
          file: f.file,
          fix: f.fix,
        }));
      return {
        fixes: fixSuggestions,
        totalFixable: scanResult.findings.filter((f) => f.type === 'fail' && f.fixDiff).length,
      };
    }

    case 5: {
      const passports = await deps.passportService.listPassports(projectPath);
      const highRisk = passports.find(
        (p) => p.compliance.eu_ai_act.risk_class === 'high',
      );

      if (highRisk) {
        const fria = await deps.passportService.generateFriaReport(highRisk.name, projectPath);
        return {
          documentType: 'fria',
          agentName: highRisk.name,
          savedPath: fria?.savedPath ?? null,
        };
      }
      return {
        documentType: 'none',
        message: 'No high-risk agents found. FRIA not required.',
        suggestion: 'You can generate a compliance report with: complior report',
      };
    }

    default:
      return {};
  }
};

export const createGuidedOnboardingRoute = (deps: GuidedOnboardingDeps) => {
  const app = new Hono();

  // POST /onboarding/guided/start — start or resume guided onboarding
  app.post('/onboarding/guided/start', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const projectPath = resolveProjectPath(body, deps.getProjectPath);
    let state = await deps.loadOnboardingState(projectPath);

    if (state.status === 'completed') {
      return c.json({ state, message: 'Onboarding already completed' });
    }

    if (state.status === 'not_started') {
      state = startOnboarding(state);
      const stepData = await executeStep(1, deps, projectPath);
      state = completeStep(state, 1, stepData);
      await deps.saveOnboardingState(projectPath, state);
    }

    return c.json({ state, progress: getProgress(state) });
  });

  // GET /onboarding/guided/status — get current state
  app.get('/onboarding/guided/status', async (c) => {
    const projectPath = c.req.query('path') || deps.getProjectPath();
    const state = await deps.loadOnboardingState(projectPath);
    return c.json({ state, progress: getProgress(state) });
  });

  // POST /onboarding/guided/step/:n — execute step n
  app.post('/onboarding/guided/step/:n', async (c) => {
    const stepNum = parseInt(c.req.param('n'), 10);
    if (isNaN(stepNum) || stepNum < 1 || stepNum > 5) {
      throw new ValidationError('Step must be between 1 and 5');
    }

    const body = await c.req.json().catch(() => ({}));
    const projectPath = resolveProjectPath(body, deps.getProjectPath);
    let state = await deps.loadOnboardingState(projectPath);

    if (!canRunStep(state, stepNum)) {
      throw new ValidationError(
        `Cannot run step ${stepNum}. Current step: ${state.currentStep}, status: ${state.status}`,
      );
    }

    const stepData = await executeStep(stepNum, deps, projectPath);
    state = completeStep(state, stepNum, stepData);
    await deps.saveOnboardingState(projectPath, state);

    return c.json({
      step: stepNum,
      data: stepData,
      state,
      progress: getProgress(state),
    });
  });

  // POST /onboarding/guided/reset — reset onboarding progress
  app.post('/onboarding/guided/reset', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const projectPath = resolveProjectPath(body, deps.getProjectPath);
    const freshState = createInitialState();
    await deps.saveOnboardingState(projectPath, freshState);
    return c.json({ state: freshState, progress: getProgress(freshState) });
  });

  return app;
};
