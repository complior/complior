import { describe, it, expect } from 'vitest';
import { generateSbom, classifyComponents } from './sbom.js';
import type { ParsedDependency } from './layers/layer3-parsers.js';

const makeDep = (overrides: Partial<ParsedDependency> = {}): ParsedDependency => ({
  name: 'express',
  version: '^4.18.0',
  ecosystem: 'npm',
  ...overrides,
});

describe('classifyComponents', () => {
  it('classifies regular library', () => {
    const components = classifyComponents([makeDep({ name: 'express' })]);

    expect(components).toHaveLength(1);
    expect(components[0].type).toBe('library');
    expect(components[0].isAiSdk).toBe(false);
    expect(components[0].isBanned).toBe(false);
  });

  it('classifies AI SDK as framework', () => {
    const components = classifyComponents([makeDep({ name: 'openai', version: '^4.0.0' })]);

    expect(components).toHaveLength(1);
    expect(components[0].type).toBe('framework');
    expect(components[0].isAiSdk).toBe(true);
  });

  it('flags banned packages', () => {
    const components = classifyComponents([makeDep({ name: 'deepface', ecosystem: 'pip' })]);

    expect(components).toHaveLength(1);
    expect(components[0].isBanned).toBe(true);
  });

  it('handles mixed dependencies', () => {
    const deps = [
      makeDep({ name: 'express' }),
      makeDep({ name: 'openai' }),
      makeDep({ name: 'deepface', ecosystem: 'pip' }),
      makeDep({ name: 'react' }),
    ];

    const components = classifyComponents(deps);

    expect(components).toHaveLength(4);
    expect(components.filter((c) => c.isAiSdk)).toHaveLength(1);
    expect(components.filter((c) => c.isBanned)).toHaveLength(1);
  });
});

describe('generateSbom', () => {
  it('returns valid CycloneDX 1.5 format', () => {
    const sbom = generateSbom([makeDep()]);

    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.5');
    expect(sbom.version).toBe(1);
    expect(sbom.serialNumber).toMatch(/^urn:uuid:/);
  });

  it('includes metadata with timestamp and tools', () => {
    const sbom = generateSbom([makeDep()]);

    expect(sbom.metadata.timestamp).toBeTruthy();
    expect(sbom.metadata.tools).toHaveLength(1);
    expect(sbom.metadata.tools[0].name).toBe('complior');
  });

  it('generates purl for npm packages', () => {
    const sbom = generateSbom([makeDep({ name: 'express', version: '^4.18.0', ecosystem: 'npm' })]);

    expect(sbom.components[0].purl).toBe('pkg:npm/express@4.18.0');
  });

  it('generates purl for pip packages', () => {
    const sbom = generateSbom([makeDep({ name: 'requests', version: '>=2.28.0', ecosystem: 'pip' })]);

    expect(sbom.components[0].purl).toBe('pkg:pypi/requests@2.28.0');
  });

  it('generates purl for cargo packages', () => {
    const sbom = generateSbom([makeDep({ name: 'tokio', version: '1.28', ecosystem: 'cargo' })]);

    expect(sbom.components[0].purl).toBe('pkg:cargo/tokio@1.28');
  });

  it('adds complior:ai-sdk property for AI SDKs', () => {
    const sbom = generateSbom([makeDep({ name: 'openai', version: '^4.0.0' })]);

    const aiProp = sbom.components[0].properties?.find((p) => p.name === 'complior:ai-sdk');
    expect(aiProp).toBeDefined();
    expect(aiProp?.value).toBe('true');
  });

  it('adds complior:banned property for banned packages', () => {
    const sbom = generateSbom([makeDep({ name: 'deepface', ecosystem: 'pip', version: '0.1.0' })]);

    const bannedProp = sbom.components[0].properties?.find((p) => p.name === 'complior:banned');
    expect(bannedProp).toBeDefined();
    expect(bannedProp?.value).toBe('true');
  });

  it('handles empty dependency list', () => {
    const sbom = generateSbom([]);

    expect(sbom.components).toHaveLength(0);
    expect(sbom.bomFormat).toBe('CycloneDX');
  });

  it('generates unique serial numbers', () => {
    const sbom1 = generateSbom([makeDep()]);
    const sbom2 = generateSbom([makeDep()]);

    expect(sbom1.serialNumber).not.toBe(sbom2.serialNumber);
  });

  it('strips version prefixes in components', () => {
    const sbom = generateSbom([makeDep({ name: 'react', version: '~18.2.0' })]);

    expect(sbom.components[0].version).toBe('18.2.0');
  });

  it('includes ecosystem property on all components', () => {
    const sbom = generateSbom([
      makeDep({ ecosystem: 'npm' }),
      makeDep({ name: 'flask', ecosystem: 'pip' }),
    ]);

    for (const component of sbom.components) {
      const ecosystemProp = component.properties?.find((p) => p.name === 'complior:ecosystem');
      expect(ecosystemProp).toBeDefined();
    }
  });
});
