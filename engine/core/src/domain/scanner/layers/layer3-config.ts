import type { CheckResult } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { BIAS_TESTING_PACKAGES, isBannedPackage, isAiSdkPackage, type BannedPackage } from '../rules/banned-packages.js';
import {
  parsePackageJson, parseRequirementsTxt, parseCargoToml, parseGoMod,
  type ParsedDependency,
} from './layer3-parsers.js';

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
  readonly bannedPackage?: BannedPackage;
}

// --- Config Checks ---

const checkDockerComposeLogRetention = (content: string, filePath: string): L3CheckResult | null => {
  const hasLogging = /logging:/i.test(content);
  if (!hasLogging) {
    return {
      type: 'log-retention',
      status: 'WARNING',
      message: 'docker-compose.yml: No logging configuration found. Art. 12 requires log retention >= 180 days.',
      obligationId: 'eu-ai-act-OBL-006',
      article: 'Art. 12',
      file: filePath,
    };
  }

  const hasRetentionConfig = /max-size|max-file|retention|rotate/i.test(content);
  if (hasRetentionConfig) {
    return {
      type: 'log-retention',
      status: 'OK',
      message: 'docker-compose.yml: Log retention configuration found.',
      obligationId: 'eu-ai-act-OBL-006',
      article: 'Art. 12',
      file: filePath,
    };
  }

  return {
    type: 'log-retention',
    status: 'WARNING',
    message: 'docker-compose.yml: Logging configured but no retention policy found. Ensure >= 180 days retention (Art. 12).',
    obligationId: 'eu-ai-act-OBL-006',
    article: 'Art. 12',
    file: filePath,
  };
};

const checkEnvFile = (content: string, filePath: string): readonly L3CheckResult[] => {
  const results: L3CheckResult[] = [];

  const hasAiApiKey = /(?:OPENAI|ANTHROPIC|GOOGLE_AI|COHERE|MISTRAL|HUGGINGFACE)_API_KEY/i.test(content);
  if (hasAiApiKey) {
    results.push({
      type: 'env-config',
      status: 'OK',
      message: '.env: AI API key variable detected (provider integration confirmed).',
      file: filePath,
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
      file: filePath,
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
      file: filePath,
    });
  }

  return results;
};

const checkCiConfig = (content: string, filePath: string): L3CheckResult | null => {
  const hasComplianceStep = /complior|compliance|audit|security[-_]scan|ai[-_]act/i.test(content);
  if (hasComplianceStep) {
    return {
      type: 'ci-compliance',
      status: 'OK',
      message: `${filePath}: Compliance step detected in CI/CD pipeline.`,
      file: filePath,
    };
  }

  return {
    type: 'ci-compliance',
    status: 'WARNING',
    message: `${filePath}: No compliance step detected in CI/CD pipeline. Consider adding a compliance scan.`,
    file: filePath,
  };
};

// --- L3 Runner ---

export const runLayer3 = (ctx: ScanContext): readonly L3CheckResult[] => {
  const results: L3CheckResult[] = [];
  const allDeps: ParsedDependency[] = [];

  // Parse dependency files — track source file for each dep
  const depSources = new Map<string, string>(); // dep.name → relativePath
  for (const file of ctx.files) {
    const filename = file.relativePath.split('/').pop() ?? '';
    let parsed: readonly ParsedDependency[] = [];

    if (filename === 'package.json' && !file.relativePath.includes('node_modules')) {
      parsed = parsePackageJson(file.content);
    } else if (filename === 'requirements.txt') {
      parsed = parseRequirementsTxt(file.content);
    } else if (filename === 'Cargo.toml') {
      parsed = parseCargoToml(file.content);
    } else if (filename === 'go.mod') {
      parsed = parseGoMod(file.content);
    }

    for (const dep of parsed) {
      depSources.set(dep.name, file.relativePath);
    }
    allDeps.push(...parsed);
  }

  // Check for banned packages
  for (const dep of allDeps) {
    const banned = isBannedPackage(dep.name);
    if (banned !== undefined) {
      results.push({
        type: 'banned-package',
        status: 'PROHIBITED',
        message: `Art. 5 REVIEW: "${dep.name}" detected — ${banned.reason}. Prohibited under ${banned.article} when: ${banned.prohibitedWhen}. Verify: ${banned.verifyMessage}`,
        obligationId: banned.obligationId,
        article: banned.article,
        packageName: dep.name,
        ecosystem: dep.ecosystem,
        penalty: banned.penalty,
        bannedPackage: banned,
        file: depSources.get(dep.name),
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
    const hasBiasConfig = ctx.files.some((f) =>
      /bias.?testing\.config/i.test(f.relativePath),
    );
    if (!hasBiasTesting && !hasBiasConfig) {
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
    if (/^docker-compose[\w.-]*\.ya?ml$/.test(filename)) {
      const result = checkDockerComposeLogRetention(file.content, file.relativePath);
      if (result !== null) results.push(result);
    }
  }

  // Check .env files
  for (const file of ctx.files) {
    const filename = file.relativePath.split('/').pop() ?? '';
    if (filename === '.env' || filename === '.env.example' || filename === '.env.local') {
      results.push(...checkEnvFile(file.content, file.relativePath));
    }
  }

  // Check CI/CD configs
  for (const file of ctx.files) {
    if (
      file.relativePath.includes('.github/workflows/') &&
      (file.extension === '.yml' || file.extension === '.yaml')
    ) {
      const ciResult = checkCiConfig(file.content, file.relativePath);
      if (ciResult !== null) results.push(ciResult);
    }
  }

  return results;
};

// --- Convert to CheckResults ---

export const layer3ToCheckResults = (l3Results: readonly L3CheckResult[]): readonly CheckResult[] => {
  return l3Results.map((r): CheckResult => {
    if (r.status === 'PROHIBITED') {
      const bp = r.bannedPackage;
      const fix = bp
        ? `Verify your use case for "${r.packageName}". ${bp.article} prohibits: ${bp.prohibitedWhen}. Document your use case to confirm compliance, or remove if prohibited use is confirmed.`
        : `Remove prohibited package "${r.packageName}" to comply with ${r.article}`;
      return {
        type: 'fail',
        checkId: `l3-banned-${r.packageName ?? 'unknown'}`,
        message: r.message,
        severity: 'critical',
        obligationId: r.obligationId,
        articleReference: r.article,
        fix,
        file: r.file,
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
        file: r.file,
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
