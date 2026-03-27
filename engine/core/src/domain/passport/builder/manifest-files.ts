import type { FileInfo } from '../../../ports/scanner.port.js';

const AGENTS_DIR = '.complior/agents/';
const MANIFEST_SUFFIX = '-manifest.json';

export const isPassportManifest = (relativePath: string): boolean =>
  relativePath.includes(AGENTS_DIR) && relativePath.endsWith(MANIFEST_SUFFIX);

export const filterPassportManifests = (files: readonly FileInfo[]): readonly FileInfo[] =>
  files.filter((f) => isPassportManifest(f.relativePath));

/** Extract risk_class from a parsed passport manifest JSON. Defaults to 'limited'. */
export const extractRiskClass = (manifest: Record<string, unknown>): string => {
  const compliance = manifest.compliance as Record<string, unknown> | undefined;
  const euAiAct = compliance?.eu_ai_act as Record<string, unknown> | undefined;
  return (euAiAct?.risk_class as string) ?? 'limited';
};
