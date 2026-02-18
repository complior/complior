import type { CheckResult } from '../../types/common.types.js';
import type { ScanContext } from './scanner.types.js';
import { BIAS_TESTING_PACKAGES, isBannedPackage, isAiSdkPackage } from './banned-packages.js';

// --- Types ---

export type L3FindingType =
  | 'ai-sdk-detected'
  | 'banned-package'
  | 'missing-bias-testing'
  | 'log-retention'
  | 'env-config'
  | 'ci-compliance';

export interface L3CheckResult {
  readonly type: L3FindingType;
  readonly status: 'OK' | 'WARNING' | 'FAIL' | 'PROHIBITED';
  readonly message: string;
  readonly obligationId?: string;
  readonly article?: string;
  readonly packageName?: string;
  readonly ecosystem?: string;
  readonly file?: string;
  readonly penalty?: string;
}

// --- Dependency Parsers ---

interface ParsedDependency {
  readonly name: string;
  readonly version: string;
  readonly ecosystem: string;
}

const parsePackageJson = (content: string): readonly ParsedDependency[] => {
  try {
    const pkg = JSON.parse(content) as Record<string, unknown>;
    const deps: ParsedDependency[] = [];
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      const section = pkg[field];
      if (section !== null && typeof section === 'object') {
        for (const [name, version] of Object.entries(section as Record<string, string>)) {
          deps.push({ name, version, ecosystem: 'npm' });
        }
      }
    }
    return deps;
  } catch {
    return [];
  }
};

const parseRequirementsTxt = (content: string): readonly ParsedDependency[] => {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('-'))
    .map((line) => {
      const match = line.match(/^([a-zA-Z0-9_.-]+)\s*(?:[>=<~!]+\s*(.+))?$/);
      if (match === null) return null;
      return { name: match[1], version: match[2] ?? '*', ecosystem: 'pip' };
    })
    .filter((d): d is ParsedDependency => d !== null);
};

const parseCargoToml = (content: string): readonly ParsedDependency[] => {
  const deps: ParsedDependency[] = [];
  const depSection = /\[dependencies\]([\s\S]*?)(?:\[|$)/;
  const match = content.match(depSection);
  if (match === null) return deps;

  const lines = match[1].split('\n');
  for (const line of lines) {
    const depMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"?([^"}\s]+)"?/);
    if (depMatch !== null) {
      deps.push({ name: depMatch[1], version: depMatch[2], ecosystem: 'cargo' });
    }
  }
  return deps;
};

const parseGoMod = (content: string): readonly ParsedDependency[] => {
  const deps: ParsedDependency[] = [];
  const requireBlock = /require\s*\(([\s\S]*?)\)/;
  const match = content.match(requireBlock);
  const lines = match !== null
    ? match[1].split('\n')
    : content.split('\n');

  for (const line of lines) {
    const depMatch = line.trim().match(/^([\w./\-@]+)\s+(v[\d.]+)/);
    if (depMatch !== null) {
      deps.push({ name: depMatch[1], version: depMatch[2], ecosystem: 'go' });
    }
  }
  return deps;
};

// --- Config Checks ---

const checkDockerComposeLogRetention = (content: string): L3CheckResult | null => {
  // Check for logging configuration with max-size/retention
  const hasLogging = /logging:/i.test(content);
  if (!hasLogging) {
    return {
      type: 'log-retention',
      status: 'WARNING',
      message: 'docker-compose.yml: No logging configuration found. Art. 12 requires log retention >= 180 days.',
      obligationId: 'eu-ai-act-OBL-006',
      article: 'Art. 12',
    };
  }

  // Simple check: if they mention retention or max-file
  const hasRetentionConfig = /max-size|max-file|retention|rotate/i.test(content);
  if (hasRetentionConfig) {
    return {
      type: 'log-retention',
      status: 'OK',
      message: 'docker-compose.yml: Log retention configuration found.',
      obligationId: 'eu-ai-act-OBL-006',
      article: 'Art. 12',
    };
  }

  return {
    type: 'log-retention',
    status: 'WARNING',
    message: 'docker-compose.yml: Logging configured but no retention policy found. Ensure >= 180 days retention (Art. 12).',
    obligationId: 'eu-ai-act-OBL-006',
    article: 'Art. 12',
  };
};

const checkEnvFile = (content: string): readonly L3CheckResult[] => {
  const results: L3CheckResult[] = [];

  const hasAiApiKey = /(?:OPENAI|ANTHROPIC|GOOGLE_AI|COHERE|MISTRAL|HUGGINGFACE)_API_KEY/i.test(content);
  if (hasAiApiKey) {
    results.push({
      type: 'env-config',
      status: 'OK',
      message: '.env: AI API key variable detected (provider integration confirmed).',
    });
  }

  const hasLogLevel = /LOG_LEVEL|LOGGING/i.test(content);
  if (!hasLogLevel) {
    results.push({
      type: 'env-config',
      status: 'WARNING',
      message: '.env: No LOG_LEVEL variable found. Structured logging recommended (Art. 12).',
      obligationId: 'eu-ai-act-OBL-006',
      article: 'Art. 12',
    });
  }

  const hasMonitoring = /SENTRY_DSN|DATADOG|NEW_RELIC|MONITORING|OBSERVABILITY/i.test(content);
  if (!hasMonitoring) {
    results.push({
      type: 'env-config',
      status: 'WARNING',
      message: '.env: No error monitoring/observability variable found. Monitoring recommended (Art. 26).',
      obligationId: 'eu-ai-act-OBL-011',
      article: 'Art. 26',
    });
  }

  return results;
};

const checkCiConfig = (content: string, file: string): L3CheckResult | null => {
  const hasComplianceStep = /complior|compliance|audit|security[-_]scan|ai[-_]act/i.test(content);
  if (hasComplianceStep) {
    return {
      type: 'ci-compliance',
      status: 'OK',
      message: `${file}: Compliance step detected in CI/CD pipeline.`,
    };
  }

  return {
    type: 'ci-compliance',
    status: 'WARNING',
    message: `${file}: No compliance step detected in CI/CD pipeline. Consider adding a compliance scan.`,
  };
};

// --- L3 Runner ---

export const runLayer3 = (ctx: ScanContext): readonly L3CheckResult[] => {
  const results: L3CheckResult[] = [];
  const allDeps: ParsedDependency[] = [];

  // Parse dependency files
  for (const file of ctx.files) {
    const filename = file.relativePath.split('/').pop() ?? '';

    if (filename === 'package.json' && !file.relativePath.includes('node_modules')) {
      allDeps.push(...parsePackageJson(file.content));
    } else if (filename === 'requirements.txt') {
      allDeps.push(...parseRequirementsTxt(file.content));
    } else if (filename === 'Cargo.toml') {
      allDeps.push(...parseCargoToml(file.content));
    } else if (filename === 'go.mod') {
      allDeps.push(...parseGoMod(file.content));
    }
  }

  // Check for banned packages
  for (const dep of allDeps) {
    const banned = isBannedPackage(dep.name);
    if (banned !== undefined) {
      results.push({
        type: 'banned-package',
        status: 'PROHIBITED',
        message: `PROHIBITED: "${dep.name}" (${banned.reason}) — ${banned.article}. Penalty: ${banned.penalty}`,
        obligationId: banned.obligationId,
        article: banned.article,
        packageName: dep.name,
        ecosystem: dep.ecosystem,
        penalty: banned.penalty,
      });
    }
  }

  // Check for AI SDK packages
  const detectedAiSdks: string[] = [];
  for (const dep of allDeps) {
    const sdkName = isAiSdkPackage(dep.name);
    if (sdkName !== undefined) {
      detectedAiSdks.push(dep.name);
      results.push({
        type: 'ai-sdk-detected',
        status: 'OK',
        message: `AI SDK detected: ${sdkName} (${dep.name}@${dep.version}) in ${dep.ecosystem}`,
        packageName: dep.name,
        ecosystem: dep.ecosystem,
      });
    }
  }

  // Check for bias testing if AI SDK detected
  if (detectedAiSdks.length > 0) {
    const hasBiasTesting = allDeps.some((d) => BIAS_TESTING_PACKAGES.has(d.name));
    if (!hasBiasTesting) {
      results.push({
        type: 'missing-bias-testing',
        status: 'WARNING',
        message: 'AI SDKs detected but no bias testing library found. Consider adding fairlearn, aif360, or aequitas.',
        obligationId: 'eu-ai-act-OBL-009',
        article: 'Art. 10',
      });
    }
  }

  // Check docker-compose
  for (const file of ctx.files) {
    const filename = file.relativePath.split('/').pop() ?? '';
    if (filename === 'docker-compose.yml' || filename === 'docker-compose.yaml') {
      const result = checkDockerComposeLogRetention(file.content);
      if (result !== null) results.push(result);
    }
  }

  // Check .env files
  for (const file of ctx.files) {
    const filename = file.relativePath.split('/').pop() ?? '';
    if (filename === '.env' || filename === '.env.example' || filename === '.env.local') {
      results.push(...checkEnvFile(file.content));
    }
  }

  // Check CI/CD configs
  for (const file of ctx.files) {
    if (
      file.relativePath.includes('.github/workflows/') &&
      (file.extension === '.yml' || file.extension === '.yaml')
    ) {
      const result = checkCiConfig(file.content, file.relativePath);
      if (result !== null) results.push(result);
    }
  }

  return results;
};

// --- Convert to CheckResults ---

export const layer3ToCheckResults = (l3Results: readonly L3CheckResult[]): readonly CheckResult[] => {
  return l3Results.map((r): CheckResult => {
    if (r.status === 'PROHIBITED') {
      return {
        type: 'fail',
        checkId: `l3-banned-${r.packageName ?? 'unknown'}`,
        message: r.message,
        severity: 'critical',
        obligationId: r.obligationId,
        articleReference: r.article,
        fix: `Remove prohibited package "${r.packageName}" to comply with ${r.article}`,
      };
    }

    if (r.status === 'FAIL' || r.status === 'WARNING') {
      return {
        type: 'fail',
        checkId: `l3-${r.type}`,
        message: r.message,
        severity: r.status === 'FAIL' ? 'high' : 'low',
        obligationId: r.obligationId,
        articleReference: r.article,
      };
    }

    // OK
    return {
      type: 'pass',
      checkId: `l3-${r.type}`,
      message: r.message,
    };
  });
};
