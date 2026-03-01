import { describe, it, expect } from 'vitest';
import {
  createRegulationVersion,
  SCANNER_RULES_VERSION,
  REGULATION_INFO,
} from './regulation-version.js';

describe('SCANNER_RULES_VERSION', () => {
  it('is a semver string', () => {
    expect(SCANNER_RULES_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('REGULATION_INFO', () => {
  it('references eu-ai-act', () => {
    expect(REGULATION_INFO.regulation).toBe('eu-ai-act');
  });

  it('has EU regulation reference number', () => {
    expect(REGULATION_INFO.version).toBe('2024.1689');
  });

  it('has a last updated date', () => {
    const date = new Date(REGULATION_INFO.lastUpdated);
    expect(date.getTime()).not.toBeNaN();
  });
});

describe('createRegulationVersion', () => {
  it('creates version with correct fields', () => {
    const version = createRegulationVersion(19);

    expect(version.regulation).toBe('eu-ai-act');
    expect(version.version).toBe('2024.1689');
    expect(version.rulesVersion).toBe(SCANNER_RULES_VERSION);
    expect(version.checkCount).toBe(19);
    expect(version.lastUpdated).toBeTruthy();
  });

  it('reflects actual check count', () => {
    const v1 = createRegulationVersion(10);
    const v2 = createRegulationVersion(50);

    expect(v1.checkCount).toBe(10);
    expect(v2.checkCount).toBe(50);
  });

  it('returns frozen-like object', () => {
    const version = createRegulationVersion(19);
    expect(typeof version.regulation).toBe('string');
    expect(typeof version.rulesVersion).toBe('string');
    expect(typeof version.checkCount).toBe('number');
  });
});
