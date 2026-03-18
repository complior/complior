export type {
  ExternalRunner,
  ExternalRunners,
  ExternalRunnerDeps,
  ExternalRunnerResult,
  RawExternalFinding,
} from './runner-port.js';

export { createSemgrepRunner } from './semgrep-runner.js';
export { createBanditRunner } from './bandit-runner.js';
export { createModelScanRunner } from './modelscan-runner.js';
export { createDetectSecretsRunner } from './detect-secrets-runner.js';
export { mapExternalFindings } from './finding-mapper.js';
export { deduplicateFindings, mergeFindings } from './dedup.js';
export { normalizeFilePath } from './path-utils.js';
