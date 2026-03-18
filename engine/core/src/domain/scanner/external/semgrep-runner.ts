import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExternalRunner, ExternalRunnerDeps, ExternalRunnerResult, RawExternalFinding } from './runner-port.js';
import { normalizeFilePath } from './path-utils.js';

const RULES_DIR = resolve(
  fileURLToPath(import.meta.url), '..', '..', '..', '..', '..', 'data', 'semgrep-rules',
);

interface SemgrepResult {
  readonly results?: readonly SemgrepFinding[];
  readonly errors?: readonly unknown[];
}

interface SemgrepFinding {
  readonly check_id: string;
  readonly path: string;
  readonly start: { readonly line: number; readonly col: number };
  readonly end: { readonly line: number; readonly col: number };
  readonly extra: {
    readonly message: string;
    readonly severity: string;
    readonly metadata?: Record<string, unknown>;
  };
}

export const createSemgrepRunner = (): ExternalRunner => Object.freeze({
  name: 'semgrep',
  run: async (deps: ExternalRunnerDeps): Promise<ExternalRunnerResult> => {
    const startTime = Date.now();
    const toolCmd = deps.toolPath ?? 'semgrep';

    const result = await deps.runProcess(toolCmd, [
      'scan',
      '--config', RULES_DIR,
      '--json',
      '--quiet',
      '--no-git-ignore',
      deps.projectPath,
    ], { timeout: 120_000 });

    const duration = Date.now() - startTime;

    if (result.exitCode !== 0 && result.exitCode !== 1) {
      // exitCode 1 = findings found (expected), others = real error
      return {
        tool: 'semgrep',
        version: '',
        rawFindings: [],
        duration,
        exitCode: result.exitCode,
        error: result.stderr.slice(0, 500),
      };
    }

    const rawFindings = parseSemgrepOutput(result.stdout, deps.projectPath);
    return {
      tool: 'semgrep',
      version: '',
      rawFindings,
      duration,
      exitCode: result.exitCode,
    };
  },
});

export const parseSemgrepOutput = (stdout: string, projectPath: string): RawExternalFinding[] => {
  if (!stdout.trim()) return [];

  let parsed: SemgrepResult;
  try {
    parsed = JSON.parse(stdout) as SemgrepResult;
  } catch {
    return [];
  }

  if (!parsed.results) return [];

  return parsed.results.map((r): RawExternalFinding => ({
    // Semgrep prefixes rule IDs with the config path (e.g. "data.semgrep-rules.complior.bare-call")
    // Normalize to just the last dotted segment that starts with "complior."
    ruleId: r.check_id.includes('complior.')
      ? 'complior.' + r.check_id.split('complior.').pop()!
      : r.check_id,
    message: r.extra.message,
    severity: r.extra.severity,
    file: normalizeFilePath(r.path, projectPath),
    line: r.start.line,
    column: r.start.col,
  }));
};
