import type { ExternalRunner, ExternalRunnerDeps, ExternalRunnerResult, RawExternalFinding } from './runner-port.js';
import { normalizeFilePath } from './path-utils.js';

interface BanditResult {
  readonly results?: readonly BanditFinding[];
  readonly errors?: readonly unknown[];
}

interface BanditFinding {
  readonly test_id: string;
  readonly test_name: string;
  readonly issue_text: string;
  readonly issue_severity: string;
  readonly issue_confidence: string;
  readonly filename: string;
  readonly line_number: number;
  readonly col_offset?: number;
}

export const createBanditRunner = (): ExternalRunner => Object.freeze({
  name: 'bandit',
  run: async (deps: ExternalRunnerDeps): Promise<ExternalRunnerResult> => {
    // Only run if Python files exist
    const hasPython = deps.files.some((f) =>
      f.extension === '.py' || f.relativePath.endsWith('.py'),
    );
    if (!hasPython) {
      return {
        tool: 'bandit',
        version: '',
        rawFindings: [],
        duration: 0,
        exitCode: 0,
      };
    }

    const startTime = Date.now();
    const toolCmd = deps.toolPath ?? 'bandit';

    const result = await deps.runProcess(toolCmd, [
      '-r', deps.projectPath,
      '-f', 'json',
      '-q',
      '--exclude', `${deps.projectPath}/.complior`,
    ], { timeout: 120_000 });

    const duration = Date.now() - startTime;

    if (result.exitCode !== 0 && result.exitCode !== 1) {
      return {
        tool: 'bandit',
        version: '',
        rawFindings: [],
        duration,
        exitCode: result.exitCode,
        error: result.stderr.slice(0, 500),
      };
    }

    const rawFindings = parseBanditOutput(result.stdout, deps.projectPath);
    return {
      tool: 'bandit',
      version: '',
      rawFindings,
      duration,
      exitCode: result.exitCode,
    };
  },
});

export const parseBanditOutput = (stdout: string, projectPath: string): RawExternalFinding[] => {
  if (!stdout.trim()) return [];

  let parsed: BanditResult;
  try {
    parsed = JSON.parse(stdout) as BanditResult;
  } catch {
    return [];
  }

  if (!parsed.results) return [];

  return parsed.results.map((r): RawExternalFinding => ({
    ruleId: r.test_id,
    message: `${r.test_name}: ${r.issue_text}`,
    severity: r.issue_severity,
    file: normalizeFilePath(r.filename, projectPath),
    line: r.line_number,
  }));
};
