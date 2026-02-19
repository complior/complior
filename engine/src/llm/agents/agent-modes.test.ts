import { describe, it, expect } from 'vitest';
import { getAgentConfig, getAllModes, nextMode } from './modes.js';

describe('Agent Modes', () => {
  it('provides 4 modes', () => {
    expect(getAllModes()).toEqual(['build', 'comply', 'audit', 'learn']);
  });

  it('build mode enables writes', () => {
    const config = getAgentConfig('build');
    expect(config.writeEnabled).toBe(true);
    expect(config.label).toBe('BUILD');
  });

  it('comply mode disables writes', () => {
    const config = getAgentConfig('comply');
    expect(config.writeEnabled).toBe(false);
  });

  it('audit mode disables writes', () => {
    const config = getAgentConfig('audit');
    expect(config.writeEnabled).toBe(false);
  });

  it('learn mode disables writes', () => {
    const config = getAgentConfig('learn');
    expect(config.writeEnabled).toBe(false);
  });

  it('all modes have disclaimer in system prompt', () => {
    for (const mode of getAllModes()) {
      const config = getAgentConfig(mode);
      expect(config.systemPrompt).toContain('not a legal advisor');
      expect(config.systemPrompt).toContain('NEVER');
    }
  });

  it('nextMode cycles through modes', () => {
    expect(nextMode('build')).toBe('comply');
    expect(nextMode('comply')).toBe('audit');
    expect(nextMode('audit')).toBe('learn');
    expect(nextMode('learn')).toBe('build');
  });
});
