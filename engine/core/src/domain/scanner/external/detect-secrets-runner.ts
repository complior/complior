import type { ExternalRunner, ExternalRunnerDeps, ExternalRunnerResult, RawExternalFinding } from './runner-port.js';
import { normalizeFilePath } from './path-utils.js';

interface DetectSecretsResult {
  readonly results?: Record<string, readonly DetectSecretsFinding[]>;
  readonly version?: string;
}

interface DetectSecretsFinding {
  readonly type: string;
  readonly line_number: number;
  readonly hashed_secret: string;
  readonly is_verified?: boolean;
}

export const createDetectSecretsRunner = (): ExternalRunner => Object.freeze({
  name: 'detect-secrets',
  run: async (deps: ExternalRunnerDeps): Promise<ExternalRunnerResult> => {
    const startTime = Date.now();
    const toolCmd = deps.toolPath ?? 'detect-secrets';

    const result = await deps.runProcess(toolCmd, [
      'scan',
      '--all-files',
      '--exclude-files', '\\.complior/|node_modules/|dist/|\\.git/',
    ], { timeout: 120_000, cwd: deps.projectPath });

    const duration = Date.now() - startTime;

    if (result.exitCode !== 0) {
      return {
        tool: 'detect-secrets',
        version: '',
        rawFindings: [],
        duration,
        exitCode: result.exitCode,
        error: result.stderr.slice(0, 500),
      };
    }

    const rawFindings = parseDetectSecretsOutput(result.stdout, deps.projectPath);
    return {
      tool: 'detect-secrets',
      version: '',
      rawFindings,
      duration,
      exitCode: result.exitCode,
    };
  },
});

export const parseDetectSecretsOutput = (stdout: string, projectPath: string): RawExternalFinding[] => {
  if (!stdout.trim()) return [];

  let parsed: DetectSecretsResult;
  try {
    parsed = JSON.parse(stdout) as DetectSecretsResult;
  } catch {
    return [];
  }

  if (!parsed.results) return [];

  const findings: RawExternalFinding[] = [];
  for (const [filePath, secrets] of Object.entries(parsed.results)) {
    const relativePath = normalizeFilePath(filePath, projectPath);

    for (const secret of secrets) {
      findings.push({
        ruleId: secret.type,
        message: `${secret.type} detected${secret.is_verified ? ' (verified)' : ''}`,
        severity: 'high',
        file: relativePath,
        line: secret.line_number,
        category: 'secrets',
      });
    }
  }

  return findings;
};
