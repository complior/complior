import type { ExternalRunner, ExternalRunnerDeps, ExternalRunnerResult, RawExternalFinding } from './runner-port.js';
import { normalizeFilePath } from './path-utils.js';

const MODEL_EXTENSIONS = new Set(['.pkl', '.pickle', '.pt', '.pth', '.h5', '.hdf5', '.safetensors', '.onnx', '.pb', '.tflite']);

const EXCLUDED_DIRS = ['node_modules/', 'dist/', '.complior/'];

interface ModelScanResult {
  readonly summary?: {
    readonly total_issues_by_severity?: Record<string, number>;
  };
  readonly issues?: readonly ModelScanIssue[];
}

interface ModelScanIssue {
  readonly severity: string;
  readonly description: string;
  readonly source: string;
  readonly scanner: string;
}

export const createModelScanRunner = (): ExternalRunner => Object.freeze({
  name: 'modelscan',
  run: async (deps: ExternalRunnerDeps): Promise<ExternalRunnerResult> => {
    // Only run if model files exist outside excluded dirs
    const isExcluded = (path: string) => EXCLUDED_DIRS.some(d => path.includes(d));
    const hasModels = deps.files.some((f) => MODEL_EXTENSIONS.has(f.extension) && !isExcluded(f.relativePath));
    if (!hasModels) {
      return {
        tool: 'modelscan',
        version: '',
        rawFindings: [],
        duration: 0,
        exitCode: 0,
      };
    }

    const startTime = Date.now();
    const toolCmd = deps.toolPath ?? 'modelscan';

    const result = await deps.runProcess(toolCmd, [
      'scan',
      '-p', deps.projectPath,
      '-r', 'json',
      '-l', 'ERROR',
    ], { timeout: 180_000 });

    const duration = Date.now() - startTime;

    if (result.exitCode !== 0 && result.exitCode !== 1) {
      return {
        tool: 'modelscan',
        version: '',
        rawFindings: [],
        duration,
        exitCode: result.exitCode,
        error: result.stderr.slice(0, 500),
      };
    }

    const rawFindings = parseModelScanOutput(result.stdout, deps.projectPath);
    return {
      tool: 'modelscan',
      version: '',
      rawFindings,
      duration,
      exitCode: result.exitCode,
    };
  },
});

export const parseModelScanOutput = (stdout: string, projectPath: string): RawExternalFinding[] => {
  if (!stdout.trim()) return [];

  // ModelScan mixes info messages with JSON in stdout and word-wraps
  // long strings with literal newlines inside JSON values (invalid JSON).
  // Extract JSON by finding the first '{', then sanitize embedded newlines.
  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) return [];

  const sanitized = stdout.slice(jsonStart).replace(/\n/g, ' ');

  let parsed: ModelScanResult;
  try {
    parsed = JSON.parse(sanitized) as ModelScanResult;
  } catch {
    return [];
  }

  if (!parsed.issues) return [];

  return parsed.issues
    .filter((issue) => !EXCLUDED_DIRS.some(d => issue.source.includes(d)))
    .map((issue): RawExternalFinding => ({
      ruleId: `modelscan-${issue.scanner}`,
      message: issue.description,
      severity: issue.severity,
      file: normalizeFilePath(issue.source, projectPath),
      category: 'model-safety',
    }));
};
