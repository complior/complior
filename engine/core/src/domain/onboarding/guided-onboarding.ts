/**
 * US-S05-33: Guided 5-step onboarding state machine.
 * Pure domain logic — no I/O, no side effects.
 */

export type GuidedStepName =
  | 'detect'
  | 'scan'
  | 'passport'
  | 'fix'
  | 'document';

export type GuidedStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface GuidedStepState {
  readonly step: number;
  readonly name: GuidedStepName;
  readonly label: string;
  readonly status: GuidedStepStatus;
  readonly data?: Record<string, unknown>;
  readonly completedAt?: string;
}

export interface GuidedOnboardingState {
  readonly currentStep: number;
  readonly status: 'not_started' | 'in_progress' | 'completed';
  readonly steps: readonly GuidedStepState[];
  readonly startedAt?: string;
  readonly completedAt?: string;
}

const STEP_DEFINITIONS: readonly { name: GuidedStepName; label: string }[] = [
  { name: 'detect', label: 'Detect Project' },
  { name: 'scan', label: 'First Compliance Scan' },
  { name: 'passport', label: 'Generate Agent Passport' },
  { name: 'fix', label: 'Top-3 Quick Fixes' },
  { name: 'document', label: 'Generate Compliance Document' },
];

export const createInitialState = (): GuidedOnboardingState => {
  const steps = STEP_DEFINITIONS.map((def, i) => ({
    step: i + 1,
    name: def.name,
    label: def.label,
    status: 'pending' as GuidedStepStatus,
  }));

  return Object.freeze({
    currentStep: 0,
    status: 'not_started',
    steps,
  });
};

export const startOnboarding = (state: GuidedOnboardingState): GuidedOnboardingState => {
  if (state.status === 'completed') return state;

  return Object.freeze({
    ...state,
    currentStep: 1,
    status: 'in_progress',
    startedAt: state.startedAt ?? new Date().toISOString(),
    steps: state.steps.map((s, i) =>
      i === 0 ? { ...s, status: 'in_progress' as GuidedStepStatus } : s,
    ),
  });
};

const advanceStep = (
  state: GuidedOnboardingState,
  stepNumber: number,
  stepStatus: GuidedStepStatus,
  data?: Record<string, unknown>,
): GuidedOnboardingState => {
  if (stepNumber < 1 || stepNumber > 5) return state;
  if (state.status !== 'in_progress') return state;

  const idx = stepNumber - 1;
  const isLastStep = stepNumber === 5;
  const nextStep = isLastStep ? 5 : stepNumber + 1;

  const newSteps = state.steps.map((s, i) => {
    if (i === idx) {
      return { ...s, status: stepStatus, data, completedAt: new Date().toISOString() };
    }
    if (i === idx + 1 && !isLastStep) {
      return { ...s, status: 'in_progress' as GuidedStepStatus };
    }
    return s;
  });

  return Object.freeze({
    ...state,
    currentStep: nextStep,
    status: isLastStep ? 'completed' : 'in_progress',
    completedAt: isLastStep ? new Date().toISOString() : undefined,
    steps: newSteps,
  });
};

export const completeStep = (
  state: GuidedOnboardingState,
  stepNumber: number,
  data?: Record<string, unknown>,
): GuidedOnboardingState => advanceStep(state, stepNumber, 'completed', data);

export const skipStep = (
  state: GuidedOnboardingState,
  stepNumber: number,
): GuidedOnboardingState => advanceStep(state, stepNumber, 'skipped');

export const canRunStep = (state: GuidedOnboardingState, stepNumber: number): boolean => {
  if (stepNumber < 1 || stepNumber > 5) return false;
  if (state.status !== 'in_progress') return false;
  return state.currentStep === stepNumber;
};

export const getProgress = (state: GuidedOnboardingState): {
  completedSteps: number;
  totalSteps: number;
  percentage: number;
} => {
  const completedSteps = state.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped',
  ).length;

  return {
    completedSteps,
    totalSteps: 5,
    percentage: Math.round((completedSteps / 5) * 100),
  };
};
