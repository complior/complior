import type { FixStrategy, FixAction } from '../types.js';
import { generateCreateDiff } from '../diff.js';

export const killSwitchTestStrategy: FixStrategy = (finding, context) => {
  if (finding.checkId !== 'cross-kill-switch-no-test') return null;

  const testPath = 'src/safety/kill-switch.test.ts';
  const content = `// Kill Switch Tests (EU AI Act, Art. 14)
// Verifies emergency shutdown capability for AI system
import { describe, it, expect, afterEach } from 'vitest';
import { isAiEnabled, emergencyShutdown, restoreService, withKillSwitch } from './kill-switch';

const ENV_KEY = 'AI_KILL_SWITCH';

describe('Kill Switch (Art. 14)', () => {
  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  describe('isAiEnabled', () => {
    it('returns true when env var is not set', () => {
      expect(isAiEnabled()).toBe(true);
    });

    it('returns false when env var is "1"', () => {
      process.env[ENV_KEY] = '1';
      expect(isAiEnabled()).toBe(false);
    });

    it('returns false when env var is "true"', () => {
      process.env[ENV_KEY] = 'true';
      expect(isAiEnabled()).toBe(false);
    });
  });

  describe('emergencyShutdown', () => {
    it('disables AI system', () => {
      emergencyShutdown('safety concern');
      expect(isAiEnabled()).toBe(false);
    });
  });

  describe('restoreService', () => {
    it('re-enables AI system after shutdown', () => {
      emergencyShutdown('test');
      restoreService();
      expect(isAiEnabled()).toBe(true);
    });
  });

  describe('withKillSwitch', () => {
    it('executes fn when AI is enabled', () => {
      const result = withKillSwitch(() => 42, 0);
      expect(result).toBe(42);
    });

    it('returns fallback when AI is disabled', () => {
      emergencyShutdown('test');
      const result = withKillSwitch(() => 42, 0);
      expect(result).toBe(0);
    });
  });
});
`;

  const action: FixAction = {
    type: 'create',
    path: testPath,
    content,
    description: 'Create kill-switch test suite for safety verification',
  };

  return {
    obligationId: finding.obligationId ?? 'eu-ai-act-OBL-010',
    checkId: finding.checkId,
    article: finding.articleReference ?? 'Art. 14',
    fixType: 'code_injection',
    framework: context.framework,
    actions: [action],
    diff: generateCreateDiff(testPath, content),
    scoreImpact: 4,
    commitMessage: 'fix: add kill-switch tests (Art. 14) -- via Complior',
    description: 'Add automated tests for AI kill switch safety mechanism',
  };
};
