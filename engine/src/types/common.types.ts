// --- Risk & Severity ---

export type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal' | 'gpai';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ComplianceStatus = 'fully_met' | 'partially_met' | 'not_met' | 'not_applicable';

export type ScoreZone = 'red' | 'yellow' | 'green';

export type ObligationType =
  | 'training'
  | 'documentation'
  | 'organizational'
  | 'assessment'
  | 'technical'
  | 'monitoring'
  | 'reporting'
  | 'transparency';

export type Role = 'provider' | 'deployer' | 'both';

// --- Check Results ---

export type CheckResultType = 'pass' | 'fail' | 'skip';

export type CheckResult = Readonly<
  | { readonly type: 'pass'; readonly checkId: string; readonly message: string }
  | {
      readonly type: 'fail';
      readonly checkId: string;
      readonly message: string;
      readonly severity: Severity;
      readonly obligationId?: string;
      readonly articleReference?: string;
      readonly fix?: string;
    }
  | { readonly type: 'skip'; readonly checkId: string; readonly reason: string }
>;

// --- Findings ---

export interface Finding {
  readonly checkId: string;
  readonly type: CheckResultType;
  readonly message: string;
  readonly severity: Severity;
  readonly file?: string;
  readonly line?: number;
  readonly obligationId?: string;
  readonly articleReference?: string;
  readonly fix?: string;
  readonly priority?: number;
  readonly confidence?: number;
  readonly confidenceLevel?: string;
}

// --- Score ---

export interface CategoryScore {
  readonly category: string;
  readonly weight: number;
  readonly score: number;
  readonly obligationCount: number;
  readonly passedCount: number;
}

export interface ConfidenceSummary {
  readonly pass: number;
  readonly likelyPass: number;
  readonly uncertain: number;
  readonly likelyFail: number;
  readonly fail: number;
  readonly total: number;
}

export interface ScoreBreakdown {
  readonly totalScore: number;
  readonly zone: ScoreZone;
  readonly categoryScores: readonly CategoryScore[];
  readonly criticalCapApplied: boolean;
  readonly totalChecks: number;
  readonly passedChecks: number;
  readonly failedChecks: number;
  readonly skippedChecks: number;
  readonly confidenceSummary?: ConfidenceSummary;
}

export interface ScoreDiff {
  readonly before: number;
  readonly after: number;
  readonly delta: number;
  readonly improved: readonly string[];
  readonly degraded: readonly string[];
}

// --- Scan ---

export interface ScanResult {
  readonly score: ScoreBreakdown;
  readonly findings: readonly Finding[];
  readonly projectPath: string;
  readonly scannedAt: string;
  readonly duration: number;
  readonly filesScanned: number;
}

// --- Project Profile ---

export interface DetectedFramework {
  readonly name: string;
  readonly version?: string;
  readonly confidence: number;
}

export interface DetectedAiTool {
  readonly name: string;
  readonly version?: string;
  readonly type: 'sdk' | 'api' | 'library' | 'model';
}

export interface ProjectProfile {
  readonly frameworks: readonly DetectedFramework[];
  readonly aiTools: readonly DetectedAiTool[];
  readonly languages: readonly string[];
  readonly hasPackageJson: boolean;
  readonly detectedModels: readonly string[];
}

// --- Project Memory ---

export interface ScanRecord {
  readonly score: number;
  readonly zone: ScoreZone;
  readonly findingsCount: number;
  readonly criticalCount: number;
  readonly timestamp: string;
}

export interface FixRecord {
  readonly checkId: string;
  readonly file: string;
  readonly timestamp: string;
  readonly scoreBefore: number;
  readonly scoreAfter: number;
}

export interface ProjectMemory {
  readonly version: string;
  readonly projectPath: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly scanHistory: readonly ScanRecord[];
  readonly fixHistory: readonly FixRecord[];
  readonly profile?: ProjectProfile;
}

// --- Config ---

export interface CompliorConfig {
  readonly projectPath: string;
  readonly extends: readonly string[];
  readonly exclude: readonly string[];
  readonly severity: Severity;
  readonly outputFormat: 'json' | 'text' | 'sarif';
}

// --- Compliance Gate ---

export interface GateResult {
  readonly passed: boolean;
  readonly beforeScore: number;
  readonly afterScore: number;
  readonly delta: number;
  readonly warnings: readonly string[];
  readonly newFindings: readonly Finding[];
}

// --- Server ---

export interface EngineStatus {
  readonly ready: boolean;
  readonly version: string;
  readonly uptime: number;
  readonly lastScan?: ScanRecord;
}
