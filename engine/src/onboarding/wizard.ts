import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { autoDetect, type AutoDetectResult } from './auto-detect.js';
import { QUESTION_BLOCKS } from './questions.js';
import { buildProfile, validateProfile, type OnboardingProfile, type OnboardingAnswers } from './profile.js';

export interface WizardDeps {
  readonly getProjectPath: () => string;
}

export interface WizardResult {
  readonly profile: OnboardingProfile;
  readonly autoDetected: AutoDetectResult;
  readonly profilePath: string;
}

export const createOnboardingWizard = (deps: WizardDeps) => {
  const { getProjectPath } = deps;

  const detect = async (): Promise<AutoDetectResult> => {
    return autoDetect(getProjectPath());
  };

  const getQuestions = () => QUESTION_BLOCKS;

  const complete = async (answers: OnboardingAnswers): Promise<WizardResult> => {
    const projectPath = getProjectPath();
    const autoDetected = await autoDetect(projectPath);
    const profile = buildProfile(autoDetected, answers);

    // Validate
    const validation = validateProfile(profile);
    if (!validation.valid) {
      throw new Error(`Invalid profile: ${validation.errors?.join(', ')}`);
    }

    // Save profile
    const compliorDir = join(projectPath, '.complior');
    await mkdir(compliorDir, { recursive: true });
    const profilePath = join(compliorDir, 'profile.json');
    await writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf-8');

    return Object.freeze({ profile, autoDetected, profilePath });
  };

  const loadProfile = async (): Promise<OnboardingProfile | null> => {
    const profilePath = join(getProjectPath(), '.complior', 'profile.json');
    const content = await readFile(profilePath, 'utf-8').catch(() => null);
    if (!content) return null;

    const parsed = JSON.parse(content);
    const validation = validateProfile(parsed);
    if (!validation.valid) return null;

    return parsed as OnboardingProfile;
  };

  const hasProfile = async (): Promise<boolean> => {
    const profile = await loadProfile();
    return profile !== null;
  };

  return Object.freeze({ detect, getQuestions, complete, loadProfile, hasProfile });
};

export type OnboardingWizard = ReturnType<typeof createOnboardingWizard>;
