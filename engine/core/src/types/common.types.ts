import type { DocQualityLevel } from './passport.types.js';

// --- Risk & Severity ---

export type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal' | 'gpai' | 'gpai_systemic';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

/** Compare two severity values for sorting (most severe first). */
export const compareSeverity = (a: Severity, b: Severity): number =>
  (SEVERITY_ORDER[a] ?? 4) - (SEVERITY_ORDER[b] ?? 4);

export type ComplianceStatus = 'fully_met' | 'partially_met' | 'not_met' | 'not_applicable';

export type ScoreZone = 'red' | 'yellow' | 'green';

export type ScanMode = 'basic' | 'security' | 'llm';

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

export type CheckResultType = 'pass' | 'fail' | 'skip' | 'info';

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
      readonly file?: string;
      readonly line?: number;
    }
  | {
      readonly type: 'info';
      readonly checkId: string;
      readonly message: string;
      readonly severity: Severity;
      readonly obligationId?: string;
      readonly articleReference?: string;
      readonly fix?: string;
      readonly file?: string;
      readonly line?: number;
    }
  | { readonly type: 'skip'; readonly checkId: string; readonly reason: string }
>;

// --- Findings ---

export interface Evidence {
  readonly findingId: string;
  readonly layer: string;
  readonly timestamp: string;
  readonly source: string;
  readonly snippet?: string;
  readonly file?: string;
  readonly line?: number;
}

export interface CodeContextLine {
  readonly num: number;
  readonly content: string;
}

export interface CodeContext {
  readonly lines: readonly CodeContextLine[];
  readonly startLine: number;
  readonly highlightLine?: number;
}

export interface FixDiff {
  readonly before: readonly string[];
  readonly after: readonly string[];
  readonly startLine: number;
  readonly filePath: string;
  /** Import line to add at top of file (e.g. "import { complior } from '@complior/sdk'"). */
  readonly importLine?: string;
}

export interface FindingExplanation {
  readonly article: string;
  readonly penalty: string;
  readonly deadline: string;
  readonly business_impact: string;
}

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
  readonly evidence?: readonly Evidence[];
  readonly codeContext?: CodeContext;
  readonly fixDiff?: FixDiff;
  readonly explanation?: FindingExplanation;
  /** Agent passport name (enriched post-scan from passport source_files). */
  readonly agentId?: string;
  /** Document quality level (none → scaffold → draft → reviewed). */
  readonly docQuality?: DocQualityLevel;
  /** True when this finding was analyzed/modified by L5 LLM. */
  readonly l5Analyzed?: boolean;
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

// --- Scan Tiers ---

export type ScanTier = 1 | 2 | 3;

export type ExternalToolName = 'semgrep' | 'bandit' | 'modelscan' | 'detect-secrets';

export interface ExternalToolResult {
  readonly tool: ExternalToolName;
  readonly version: string;
  readonly findings: readonly Finding[];
  readonly duration: number;
  readonly exitCode: number;
  readonly error?: string;
}

// --- Scan ---

export interface RegulationVersion {
  readonly regulation: string;
  readonly version: string;
  readonly rulesVersion: string;
  readonly checkCount: number;
  readonly lastUpdated: string;
}

export interface AgentSummary {
  readonly agentId: string;
  readonly agentName: string;
  readonly findingCount: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly fileCount: number;
}

export interface ScanResult {
  readonly score: ScoreBreakdown;
  readonly findings: readonly Finding[];
  readonly projectPath: string;
  readonly scannedAt: string;
  readonly duration: number;
  readonly filesScanned: number;
  readonly deepAnalysis?: boolean;
  readonly l5Cost?: number;
  readonly regulationVersion?: RegulationVersion;
  readonly tier?: ScanTier;
  readonly externalToolResults?: readonly ExternalToolResult[];
  readonly agentSummaries?: readonly AgentSummary[];
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

// --- Scan History ---

export interface ScanRecord {
  readonly score: number;
  readonly zone: ScoreZone;
  readonly findingsCount: number;
  readonly criticalCount: number;
  readonly timestamp: string;
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
  readonly mode: string;
  readonly uptime: number;
  readonly lastScan?: ScanRecord;
}

// --- Evidence Chain (used by evidence-store, read from disk) ---

export interface EvidenceEntry {
  readonly evidence: Evidence;
  readonly scanId: string;
  readonly chainPrev: string | null;
  readonly hash: string;
  readonly signature: string;
}

export interface EvidenceChain {
  readonly version: '1.0.0';
  readonly projectPath: string;
  readonly entries: readonly EvidenceEntry[];
  readonly lastHash: string;
}
