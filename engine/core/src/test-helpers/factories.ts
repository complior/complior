import type {
  Finding,
  CheckResult,
  ScanResult,
  CompliorConfig,
  ProjectProfile,
} from '../types/common.types.js';

export const createMockFinding = (overrides?: Partial<Finding>): Finding => ({
  checkId: 'CHECK-001',
  type: 'fail',
  message: 'Test finding',
  severity: 'medium',
  ...overrides,
});

export const createMockCheckResult = (overrides?: Partial<Extract<CheckResult, { readonly type: 'fail' }>>): CheckResult => ({
  type: 'fail',
  checkId: 'CHECK-001',
  message: 'Test check result',
  severity: 'medium',
  ...overrides,
});

export const createMockScanResult = (overrides?: Partial<ScanResult>): ScanResult => ({
  score: {
    totalScore: 75,
    zone: 'yellow',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: 10,
    passedChecks: 7,
    failedChecks: 2,
    skippedChecks: 1,
  },
  findings: [],
  projectPath: '/test/project',
  scannedAt: new Date().toISOString(),
  duration: 150,
  filesScanned: 10,
  ...overrides,
});

export const createMockConfig = (overrides?: Partial<CompliorConfig>): CompliorConfig => ({
  projectPath: '/test/project',
  extends: ['complior:eu-ai-act'],
  exclude: ['node_modules', '.git', 'dist', 'build'],
  severity: 'low',
  outputFormat: 'json',
  ...overrides,
});

export const createMockProjectProfile = (overrides?: Partial<ProjectProfile>): ProjectProfile => ({
  frameworks: [{ name: 'Next.js', version: '^14.0.0', confidence: 1.0 }],
  aiTools: [{ name: 'OpenAI', version: '^4.0.0', type: 'sdk' }],
  languages: ['TypeScript', 'JavaScript'],
  hasPackageJson: true,
  detectedModels: ['gpt-4'],
  ...overrides,
});
