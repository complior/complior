import type { L3CheckResult } from './layers/layer3-config.js';
import type { ParsedDependency } from './layers/layer3-parsers.js';
import { isBannedPackage, isAiSdkPackage } from './rules/banned-packages.js';
import { SCANNER_RULES_VERSION } from './regulation-version.js';

export interface SbomComponent {
  readonly type: 'library' | 'framework';
  readonly name: string;
  readonly version: string;
  readonly ecosystem: string;
  readonly isAiSdk: boolean;
  readonly isBanned: boolean;
  readonly licenses?: readonly string[];
}

// CycloneDX 1.5 JSON structure (simplified to match spec without external deps)
export interface CycloneDxBom {
  readonly bomFormat: 'CycloneDX';
  readonly specVersion: '1.5';
  readonly serialNumber: string;
  readonly version: number;
  readonly metadata: {
    readonly timestamp: string;
    readonly tools: readonly { readonly name: string; readonly version: string }[];
  };
  readonly components: readonly CycloneDxComponent[];
}

interface CycloneDxComponent {
  readonly type: 'library' | 'framework';
  readonly name: string;
  readonly version: string;
  readonly purl?: string;
  readonly properties?: readonly { readonly name: string; readonly value: string }[];
}

const ecosystemToPurlType = (ecosystem: string): string => {
  switch (ecosystem) {
    case 'npm': return 'npm';
    case 'pip': return 'pypi';
    case 'cargo': return 'cargo';
    case 'go': return 'golang';
    default: return 'generic';
  }
};

const generatePurl = (name: string, version: string, ecosystem: string): string => {
  const purlType = ecosystemToPurlType(ecosystem);
  const cleanVersion = version.replace(/^[\^~>=<]+/, '');
  return `pkg:${purlType}/${encodeURIComponent(name)}@${cleanVersion}`;
};

const generateSerialNumber = (): string => {
  const hex = (n: number): string => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, '0');
  return `urn:uuid:${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`;
};

export const classifyComponents = (
  dependencies: readonly ParsedDependency[],
): readonly SbomComponent[] =>
  dependencies.map((dep): SbomComponent => {
    const aiSdk = isAiSdkPackage(dep.name);
    const banned = isBannedPackage(dep.name);

    return {
      type: aiSdk !== undefined ? 'framework' : 'library',
      name: dep.name,
      version: dep.version,
      ecosystem: dep.ecosystem,
      isAiSdk: aiSdk !== undefined,
      isBanned: banned !== undefined,
    };
  });

export const generateSbom = (
  dependencies: readonly ParsedDependency[],
): CycloneDxBom => {
  const components = classifyComponents(dependencies);

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: generateSerialNumber(),
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{
        name: 'complior',
        version: SCANNER_RULES_VERSION,
      }],
    },
    components: components.map((c): CycloneDxComponent => ({
      type: c.type,
      name: c.name,
      version: c.version.replace(/^[\^~>=<]+/, ''),
      purl: generatePurl(c.name, c.version, c.ecosystem),
      properties: [
        { name: 'complior:ecosystem', value: c.ecosystem },
        ...(c.isAiSdk ? [{ name: 'complior:ai-sdk', value: 'true' }] : []),
        ...(c.isBanned ? [{ name: 'complior:banned', value: 'true' }] : []),
      ],
    })),
  };
};
