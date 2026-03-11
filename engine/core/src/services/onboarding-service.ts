/**
 * US-S05-33: Onboarding Service
 *
 * Orchestrates the 5-step guided onboarding wizard by coordinating
 * the pure FSM domain functions with state persistence.
 */

import type { GuidedOnboardingState } from '../domain/onboarding/guided-onboarding.js';
import {
  createInitialState,
  startOnboarding,
  completeStep,
  canRunStep,
  TOTAL_STEPS,
} from '../domain/onboarding/guided-onboarding.js';

export interface OnboardingServiceDeps {
  readonly getProjectPath: () => string;
  readonly loadState: (projectPath: string) => Promise<GuidedOnboardingState>;
  readonly saveState: (projectPath: string, state: GuidedOnboardingState) => Promise<void>;
  readonly executeStep: (stepNum: number, projectPath: string) => Promise<Record<string, unknown>>;
}

export interface OnboardingStatus {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly stepName: string;
  readonly completed: boolean;
  readonly steps: readonly OnboardingStepSummary[];
}

export interface OnboardingStepSummary {
  readonly number: number;
  readonly name: string;
  readonly status: 'pending' | 'active' | 'completed' | 'skipped';
}

export interface OnboardingStepResult {
  readonly step: number;
  readonly name: string;
  readonly success: boolean;
  readonly message: string;
  readonly data: Record<string, unknown>;
  readonly nextStep: number | null;
}

export interface OnboardingService {
  readonly getStatus: () => Promise<OnboardingStatus>;
  readonly start: () => Promise<OnboardingStatus>;
  readonly advanceStep: (stepNumber: number) => Promise<OnboardingStepResult>;
  readonly reset: () => Promise<OnboardingStatus>;
}

const toStatus = (state: GuidedOnboardingState): OnboardingStatus => {
  const steps: OnboardingStepSummary[] = state.steps.map((s, i) => ({
    number: i + 1,
    name: s.label,
    status: s.status === 'completed' ? 'completed' as const
      : s.status === 'skipped' ? 'skipped' as const
      : s.status === 'in_progress' ? 'active' as const
      : 'pending' as const,
  }));

  // Use step labels from state (sourced from domain STEP_DEFINITIONS)
  const currentLabel = state.currentStep >= 1 && state.currentStep <= state.steps.length
    ? (state.steps[state.currentStep - 1]?.label ?? 'unknown')
    : state.status === 'completed' ? 'completed' : 'not started';

  return Object.freeze({
    currentStep: state.currentStep,
    totalSteps: TOTAL_STEPS,
    stepName: currentLabel,
    completed: state.status === 'completed',
    steps,
  });
};

export const createOnboardingService = (deps: OnboardingServiceDeps): OnboardingService => {
  const getStatus = async (): Promise<OnboardingStatus> => {
    const state = await deps.loadState(deps.getProjectPath());
    return toStatus(state);
  };

  const start = async (): Promise<OnboardingStatus> => {
    const projectPath = deps.getProjectPath();
    let state = await deps.loadState(projectPath);

    if (state.status === 'completed') {
      return toStatus(state);
    }

    if (state.status === 'not_started') {
      state = startOnboarding(state);
      // Auto-execute step 1 (detect)
      const stepData = await deps.executeStep(1, projectPath);
      state = completeStep(state, 1, stepData);
      await deps.saveState(projectPath, state);
    }

    return toStatus(state);
  };

  const advanceStep = async (stepNumber: number): Promise<OnboardingStepResult> => {
    const projectPath = deps.getProjectPath();
    let state = await deps.loadState(projectPath);

    if (stepNumber < 1 || stepNumber > TOTAL_STEPS) {
      return Object.freeze({
        step: stepNumber,
        name: 'unknown',
        success: false,
        message: `Invalid step number: ${stepNumber}. Valid range: 1-${TOTAL_STEPS}`,
        data: {},
        nextStep: null,
      });
    }

    const stepLabel = state.steps[stepNumber - 1]?.label ?? 'unknown';

    if (!canRunStep(state, stepNumber)) {
      return Object.freeze({
        step: stepNumber,
        name: stepLabel,
        success: false,
        message: `Cannot run step ${stepNumber}. Current step: ${state.currentStep}, status: ${state.status}`,
        data: {},
        nextStep: null,
      });
    }

    try {
      const stepData = await deps.executeStep(stepNumber, projectPath);
      state = completeStep(state, stepNumber, stepData);
      await deps.saveState(projectPath, state);

      const nextStep = stepNumber < TOTAL_STEPS ? stepNumber + 1 : null;
      return Object.freeze({
        step: stepNumber,
        name: stepLabel,
        success: true,
        message: `Step ${stepNumber} completed`,
        data: stepData,
        nextStep,
      });
    } catch (err) {
      return Object.freeze({
        step: stepNumber,
        name: stepLabel,
        success: false,
        message: err instanceof Error ? err.message : 'Step failed',
        data: {},
        nextStep: null,
      });
    }
  };

  const reset = async (): Promise<OnboardingStatus> => {
    const projectPath = deps.getProjectPath();
    const freshState = createInitialState();
    await deps.saveState(projectPath, freshState);
    return toStatus(freshState);
  };

  return Object.freeze({ getStatus, start, advanceStep, reset });
};
