import type { ScanResult } from './common.types.js';
import type { AgentPassport } from './passport.types.js';

// --- Check sources: what Layer 1 metric does a framework check evaluate? ---
export type CheckSource = 'scan_check' | 'passport_field' | 'document' | 'evidence';

// --- Framework check definition ---
export interface FrameworkCheck {
  readonly id: string;
  readonly name: string;
  readonly source: CheckSource;
  readonly target: string;
  readonly categoryId: string;
  readonly weight: number;
  readonly description: string;
}

// --- Framework category ---
export interface FrameworkCategory {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
}

// --- Grade mapping ---
export interface GradeThreshold {
  readonly minScore: number;
  readonly grade: string;
}

export interface GradeMapping {
  readonly type: 'letter' | 'level' | 'percentage';
  readonly thresholds: readonly GradeThreshold[];
}

// --- Framework definition (data, not behavior) ---
export interface ComplianceFramework {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly deadline?: string;
  readonly checks: readonly FrameworkCheck[];
  readonly categories: readonly FrameworkCategory[];
  readonly gradeMapping: GradeMapping;
}

// --- Foundation metrics: Layer 1 input collected from existing services ---
export interface FoundationMetrics {
  readonly scanResult: ScanResult | null;
  readonly passport: AgentPassport | null;
  readonly passportCompleteness: number;
  readonly evidenceChainValid: boolean;
  readonly evidenceEntryCount: number;
  readonly evidenceScanCount: number;
  readonly documents: ReadonlySet<string>;
}

// --- Per-framework category score ---
export interface FrameworkCategoryScore {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly score: number;
  readonly weight: number;
  readonly passedChecks: number;
  readonly totalChecks: number;
}

// --- Per-framework output ---
export interface FrameworkScoreResult {
  readonly frameworkId: string;
  readonly frameworkName: string;
  readonly score: number;
  readonly grade: string;
  readonly gradeType: 'letter' | 'level' | 'percentage';
  readonly gaps: number;
  readonly totalChecks: number;
  readonly passedChecks: number;
  readonly deadline?: string;
  readonly categories: readonly FrameworkCategoryScore[];
}

// --- All selected frameworks ---
export interface MultiFrameworkScoreResult {
  readonly frameworks: readonly FrameworkScoreResult[];
  readonly selectedFrameworkIds: readonly string[];
  readonly computedAt: string;
}
