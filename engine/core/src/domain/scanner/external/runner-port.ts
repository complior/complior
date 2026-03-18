import type { ExternalToolName } from '../../../types/common.types.js';
import type { ProcessRunner } from '../../../ports/process.port.js';

/** Raw finding from an external tool before mapping to Complior Finding. */
export interface RawExternalFinding {
  readonly ruleId: string;
  readonly message: string;
  readonly severity: string;
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
  readonly category?: string;
}

/** Result returned from a single external runner. */
export interface ExternalRunnerResult {
  readonly tool: ExternalToolName;
  readonly version: string;
  readonly rawFindings: readonly RawExternalFinding[];
  readonly duration: number;
  readonly exitCode: number;
  readonly error?: string;
}

/** Dependencies injected into each external runner. */
export interface ExternalRunnerDeps {
  readonly projectPath: string;
  readonly runProcess: ProcessRunner;
  readonly toolPath?: string;
  readonly files: readonly { readonly relativePath: string; readonly extension: string }[];
}

/** Interface all external tool runners implement. */
export interface ExternalRunner {
  readonly name: ExternalToolName;
  readonly run: (deps: ExternalRunnerDeps) => Promise<ExternalRunnerResult>;
}

/** Aggregated runners passed to scanner. */
export interface ExternalRunners {
  readonly semgrep: ExternalRunner;
  readonly bandit: ExternalRunner;
  readonly modelscan: ExternalRunner;
  readonly detectSecrets: ExternalRunner;
}
