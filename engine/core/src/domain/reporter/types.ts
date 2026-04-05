import type { SharePayload } from './share.js';

// --- Readiness ---

export type ReadinessZone = 'green' | 'yellow' | 'orange' | 'red';

export interface ReadinessDimension {
  readonly score: number | null;
  readonly weight: number;
  readonly available: boolean;
}

export interface ReadinessDashboard {
  readonly readinessScore: number;
  readonly zone: ReadinessZone;
  readonly dimensions: {
    readonly scan: ReadinessDimension;
    readonly documents: ReadinessDimension;
    readonly passports: ReadinessDimension;
    readonly eval: ReadinessDimension;
    readonly evidence: ReadinessDimension;
  };
  readonly criticalCaps: readonly string[];
  readonly daysUntilEnforcement: number;
}

// --- Document Inventory ---

export type DocumentStatusLevel = 'missing' | 'scaffold' | 'draft' | 'reviewed';

export interface DocumentStatus {
  readonly docType: string;
  readonly article: string;
  readonly description: string;
  readonly outputFile: string;
  readonly status: DocumentStatusLevel;
  readonly scoreImpact: number;
  readonly lastModified: string | null;
}

export interface DocumentInventory {
  readonly total: number;
  readonly byStatus: {
    readonly missing: number;
    readonly scaffold: number;
    readonly draft: number;
    readonly reviewed: number;
  };
  readonly score: number;
  readonly documents: readonly DocumentStatus[];
}

// --- Obligation Coverage ---

export interface ObligationDetail {
  readonly id: string;
  readonly article: string;
  readonly title: string;
  readonly role: string;
  readonly severity: string;
  readonly deadline: string | null;
  readonly covered: boolean;
  readonly linkedChecks: readonly string[];
}

export interface ArticleCoverage {
  readonly article: string;
  readonly total: number;
  readonly covered: number;
  readonly obligations: readonly ObligationDetail[];
}

export interface ObligationCoverage {
  readonly total: number;
  readonly covered: number;
  readonly uncovered: number;
  readonly coveragePercent: number;
  readonly byArticle: readonly ArticleCoverage[];
  readonly critical: readonly ObligationDetail[];
}

// --- Passport Status ---

export type CompletenessZone = 'green' | 'yellow' | 'amber' | 'red';

export interface PassportDetail {
  readonly name: string;
  readonly completeness: number;
  readonly completenessZone: CompletenessZone;
  readonly filledFields: number;
  readonly totalFields: number;
  readonly missingFields: readonly string[];
  readonly friaCompleted: boolean;
  readonly signed: boolean;
  readonly lastUpdated: string | null;
}

export interface PassportStatusSection {
  readonly totalAgents: number;
  readonly passports: readonly PassportDetail[];
  readonly averageCompleteness: number;
}

// --- Priority Action Plan ---

export type ActionSource = 'scan' | 'document' | 'obligation' | 'passport';

export interface PriorityAction {
  readonly rank: number;
  readonly source: ActionSource;
  readonly id: string;
  readonly title: string;
  readonly article: string;
  readonly severity: string;
  readonly deadline: string | null;
  readonly daysLeft: number | null;
  readonly scoreImpact: number;
  readonly fixAvailable: boolean;
  readonly command: string;
  readonly priorityScore: number;
}

export interface PriorityActionPlan {
  readonly actions: readonly PriorityAction[];
  readonly totalActions: number;
  readonly shownActions: number;
}

// --- Summary ---

export interface ReportSummary {
  readonly readinessScore: number;
  readonly zone: ReadinessZone;
  readonly scanScore: number | null;
  readonly evalScore: number | null;
  readonly documentsTotal: number;
  readonly documentsReviewed: number;
  readonly obligationsTotal: number;
  readonly obligationsCovered: number;
  readonly passportsTotal: number;
  readonly passportsComplete: number;
  readonly evidenceChainLength: number;
  readonly evidenceVerified: boolean;
  readonly totalFindings: number;
  readonly criticalFindings: number;
  readonly autoFixable: number;
  readonly daysUntilEnforcement: number;
  readonly enforcementDate: string;
  readonly generatedAt: string;
  readonly compliorVersion: string;
}

// --- Root Report ---

export interface ComplianceReport {
  readonly generatedAt: string;
  readonly compliorVersion: string;
  readonly readiness: ReadinessDashboard;
  readonly documents: DocumentInventory;
  readonly obligations: ObligationCoverage;
  readonly passports: PassportStatusSection;
  readonly actionPlan: PriorityActionPlan;
  readonly summary: ReportSummary;
}

// --- Share V2 ---

export interface SharePayloadV2 extends SharePayload {
  readonly version: 2;
  readonly readinessScore?: number;
  readonly readinessZone?: string;
  readonly dimensions?: {
    readonly scan: number | null;
    readonly documents: number | null;
    readonly passports: number | null;
    readonly eval: number | null;
    readonly evidence: number | null;
  };
  readonly documentInventory?: {
    readonly total: number;
    readonly byStatus: { readonly missing: number; readonly scaffold: number; readonly draft: number; readonly reviewed: number };
    readonly documents: readonly { readonly docType: string; readonly article: string; readonly status: string }[];
  };
  readonly obligationCoverage?: {
    readonly total: number;
    readonly covered: number;
    readonly byArticle: readonly { readonly article: string; readonly total: number; readonly covered: number }[];
  };
  readonly passportStatus?: {
    readonly totalAgents: number;
    readonly averageCompleteness: number;
    readonly passports: readonly { readonly name: string; readonly completeness: number; readonly friaCompleted: boolean; readonly signed: boolean }[];
  };
  readonly priorityActions?: readonly {
    readonly rank: number;
    readonly source: string;
    readonly id: string;
    readonly title: string;
    readonly article: string;
    readonly severity: string;
    readonly scoreImpact: number;
    readonly fixAvailable: boolean;
  }[];
  readonly reportSummary?: {
    readonly daysUntilEnforcement: number;
    readonly enforcementDate: string;
    readonly totalFindings: number;
    readonly criticalFindings: number;
    readonly autoFixable: number;
  };
}
