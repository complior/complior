import type { DocQualityLevel } from './passport.types.js';
import type { Evidence as _ScannerEvidence } from '../domain/scanner/evidence.js';
import type { PriorityAction } from '../domain/reporter/types.js';

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
      readonly count?: number;
      readonly affectedFiles?: readonly string[];
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

// --- Scan Filter Context ---

/** Context about how scan findings were filtered based on project profile. */
export interface ScanFilterContext {
  readonly role: Role;
  readonly riskLevel: string | null;
  readonly domain: string | null;
  readonly profileFound: boolean;
  readonly totalObligations: number;
  readonly applicableObligations: number;
  readonly skippedByRole: number;
  readonly skippedByRiskLevel: number;
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
  /** V1-M08: Context about profile-based filtering applied to scan findings. */
  readonly filterContext?: ScanFilterContext;
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
  readonly evidence: _ScannerEvidence;
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

// --- ISO 42001 (V1-M07) ---

export interface Iso42001Control {
  readonly controlId: string;
  readonly group: string;
  readonly title: string;
  readonly description: string;
  readonly euAiActArticles: readonly string[];
  readonly checkIds: readonly string[];
}

export type SoAApplicability = 'applicable' | 'not-applicable' | 'partial';
export type SoAStatus = 'implemented' | 'planned' | 'not-started';

export interface SoAEntry {
  readonly controlId: string;
  readonly title: string;
  readonly applicable: SoAApplicability;
  readonly justification: string;
  readonly status: SoAStatus;
  readonly evidence: readonly string[];
  readonly gaps: readonly string[];
}

export interface SoAResult {
  readonly markdown: string;
  readonly entries: readonly SoAEntry[];
  readonly completeness: number;
  readonly applicableCount: number;
  readonly implementedCount: number;
}

export type RiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost-certain';
export type RiskImpact = 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';
export type RiskTreatment = 'mitigate' | 'transfer' | 'avoid' | 'accept';

export interface RiskRegisterEntry {
  readonly riskId: string;
  readonly description: string;
  readonly source: string;
  readonly severity: Severity;
  readonly likelihood: RiskLikelihood;
  readonly impact: RiskImpact;
  readonly riskScore: number;
  readonly treatment: RiskTreatment;
  readonly mitigation: string;
  readonly owner: string;
  readonly deadline: string;
  readonly status: 'open' | 'in-progress' | 'closed';
}

// --- Eval Filter Context (V1-M12) ---

/** V1-M12: Context about how eval tests were filtered based on project profile. */
export interface EvalFilterContext {
  readonly role: Role;
  readonly riskLevel: string | null;
  readonly domain: string | null;
  readonly profileFound: boolean;
  readonly totalTests: number;
  readonly applicableTests: number;
  readonly skippedByRole: number;
  readonly skippedByRiskLevel: number;
  readonly skippedByDomain: number;
}

/** V1-M12: Explains eval score coverage and filtering applied. */
export interface EvalDisclaimer {
  readonly summary: string;
  readonly profileUsed: boolean;
  readonly testsRun: number;
  readonly testsSkipped: number;
  readonly severityWeighted: boolean;
  readonly limitations: readonly string[];
}

// --- Score Transparency (V1-M10) ---

/** V1-M10: Explains what the compliance score covers and doesn't cover. */
export interface ScoreDisclaimer {
  readonly summary: string;
  readonly coveredObligations: number;
  readonly totalApplicableObligations: number;
  readonly coveragePercent: number;
  readonly uncoveredCount: number;
  readonly limitations: readonly string[];
  readonly criticalCapExplanation: string | null;
}

/** V1-M10: Category breakdown with human-readable explanation. */
export interface CategoryBreakdown {
  readonly category: string;
  readonly score: number;
  readonly weight: number;
  readonly passed: number;
  readonly failed: number;
  readonly impact: 'high' | 'medium' | 'low';
  readonly topFailures: readonly string[];
  readonly explanation: string;
}

/** V1-M10: Aggregated compliance posture for `complior status`. */
export interface CompliancePosture {
  readonly score: ScoreBreakdown;
  readonly disclaimer: ScoreDisclaimer;
  readonly categories: readonly CategoryBreakdown[];
  readonly topActions: readonly PriorityAction[];
  readonly profile: ScanFilterContext | null;
  readonly lastScanAt: string | null;
  readonly passportCount: number;
  readonly documentCount: number;
  readonly evidenceVerified: boolean | null;
}

// --- ISO 42001 (V1-M07) --- (continued below)

export interface RiskRegisterResult {
  readonly markdown: string;
  readonly entries: readonly RiskRegisterEntry[];
  readonly totalRisks: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly averageRiskScore: number;
}
