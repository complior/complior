import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  startOnboarding,
  completeStep,
  skipStep,
  canRunStep,
  getProgress,
} from './guided-onboarding.js';

describe('guided-onboarding state machine', () => {
  it('creates initial state with 5 pending steps', () => {
    const state = createInitialState();
    expect(state.status).toBe('not_started');
    expect(state.currentStep).toBe(0);
    expect(state.steps).toHaveLength(5);
    expect(state.steps.every((s) => s.status === 'pending')).toBe(true);
  });

  it('starts onboarding — step 1 becomes in_progress', () => {
    const state = startOnboarding(createInitialState());
    expect(state.status).toBe('in_progress');
    expect(state.currentStep).toBe(1);
    expect(state.steps[0].status).toBe('in_progress');
    expect(state.startedAt).toBeTruthy();
  });

  it('does not restart a completed onboarding', () => {
    let state = startOnboarding(createInitialState());
    for (let i = 1; i <= 5; i++) {
      state = completeStep(state, i);
    }
    expect(state.status).toBe('completed');

    const restarted = startOnboarding(state);
    expect(restarted.status).toBe('completed');
  });

  it('completes step 1 and advances to step 2', () => {
    const state = startOnboarding(createInitialState());
    const next = completeStep(state, 1, { language: 'TypeScript' });

    expect(next.steps[0].status).toBe('completed');
    expect(next.steps[0].data).toEqual({ language: 'TypeScript' });
    expect(next.steps[0].completedAt).toBeTruthy();
    expect(next.steps[1].status).toBe('in_progress');
    expect(next.currentStep).toBe(2);
    expect(next.status).toBe('in_progress');
  });

  it('completes step 5 and marks onboarding as completed', () => {
    let state = startOnboarding(createInitialState());
    for (let i = 1; i <= 5; i++) {
      state = completeStep(state, i, { step: i });
    }

    expect(state.status).toBe('completed');
    expect(state.completedAt).toBeTruthy();
    expect(state.steps.every((s) => s.status === 'completed')).toBe(true);
  });

  it('skip step marks status as skipped and advances', () => {
    const state = startOnboarding(createInitialState());
    const next = skipStep(state, 1);

    expect(next.steps[0].status).toBe('skipped');
    expect(next.steps[0].completedAt).toBeTruthy();
    expect(next.steps[1].status).toBe('in_progress');
    expect(next.currentStep).toBe(2);
  });

  it('canRunStep returns true only for current step', () => {
    const state = startOnboarding(createInitialState());
    expect(canRunStep(state, 1)).toBe(true);
    expect(canRunStep(state, 2)).toBe(false);
    expect(canRunStep(state, 0)).toBe(false);
    expect(canRunStep(state, 6)).toBe(false);
  });

  it('canRunStep returns false for not_started state', () => {
    const state = createInitialState();
    expect(canRunStep(state, 1)).toBe(false);
  });

  it('getProgress tracks completion', () => {
    let state = startOnboarding(createInitialState());
    expect(getProgress(state)).toEqual({ completedSteps: 0, totalSteps: 5, percentage: 0 });

    state = completeStep(state, 1);
    expect(getProgress(state)).toEqual({ completedSteps: 1, totalSteps: 5, percentage: 20 });

    state = completeStep(state, 2);
    state = completeStep(state, 3);
    expect(getProgress(state)).toEqual({ completedSteps: 3, totalSteps: 5, percentage: 60 });
  });

  it('ignores invalid step numbers', () => {
    const state = startOnboarding(createInitialState());
    const same = completeStep(state, 0);
    expect(same).toEqual(state);

    const same2 = completeStep(state, 6);
    expect(same2).toEqual(state);
  });

  it('returns frozen state objects', () => {
    const initial = createInitialState();
    expect(Object.isFrozen(initial)).toBe(true);

    const started = startOnboarding(initial);
    expect(Object.isFrozen(started)).toBe(true);

    const completed = completeStep(started, 1);
    expect(Object.isFrozen(completed)).toBe(true);
  });

  it('step names are correct', () => {
    const state = createInitialState();
    const names = state.steps.map((s) => s.name);
    expect(names).toEqual(['detect', 'scan', 'passport', 'fix', 'document']);
  });

  it('step labels are human readable', () => {
    const state = createInitialState();
    expect(state.steps[0].label).toBe('Detect Project');
    expect(state.steps[1].label).toBe('First Compliance Scan');
    expect(state.steps[2].label).toBe('Generate Agent Passport');
    expect(state.steps[3].label).toBe('Top-3 Quick Fixes');
    expect(state.steps[4].label).toBe('Generate Compliance Document');
  });

  it('can resume from step 3 after restart', () => {
    let state = startOnboarding(createInitialState());
    state = completeStep(state, 1, { language: 'Python' });
    state = completeStep(state, 2, { score: 45 });

    // Simulate JSON persistence + reload
    const serialized = JSON.parse(JSON.stringify(state));
    expect(serialized.currentStep).toBe(3);
    expect(serialized.status).toBe('in_progress');
    expect(serialized.steps[2].status).toBe('in_progress');
    expect(canRunStep(serialized, 3)).toBe(true);
  });
});
