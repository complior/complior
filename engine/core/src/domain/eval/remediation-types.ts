/**
 * Types for eval remediation — per-test guidance, fix patches, action plans.
 *
 * US-REM-01..10: "what to do?" after eval identifies failures.
 */

// ── User Guidance (human-readable advice per action) ─────────

export interface UserGuidance {
  readonly why: string;
  readonly what_to_do: readonly string[];
  readonly verification: string;
  readonly resources: readonly string[];
}

// ── Remediation Action ───────────────────────────────────────

export type RemediationActionType = 'system_prompt' | 'api_config' | 'infrastructure' | 'process';
export type RemediationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RemediationEffort = 'minimal' | 'moderate' | 'significant';

export interface RemediationAction {
  readonly id: string;           // e.g. "CT-1-A1", "LLM01-A1"
  readonly type: RemediationActionType;
  readonly title: string;
  readonly description: string;
  readonly example: string;      // concrete code/config snippet
  readonly priority: RemediationPriority;
  readonly effort: RemediationEffort;
  readonly article_ref: string;
  readonly user_guidance: UserGuidance;
}

// ── Category Playbook ────────────────────────────────────────

export interface CategoryPlaybook {
  readonly category_id: string;  // e.g. "transparency", "LLM01"
  readonly label: string;
  readonly article_ref: string;
  readonly description: string;
  readonly actions: readonly RemediationAction[];
}

// ── OWASP Playbook (extends CategoryPlaybook) ────────────────

export interface OwaspPlaybook extends CategoryPlaybook {
  readonly owasp_ref: string;    // e.g. "OWASP LLM01"
  readonly cwe_ref: string;      // e.g. "CWE-77"
}

// ── API Config Patch (US-REM-06) ─────────────────────────────

export interface ApiConfigPatch {
  readonly headers: Record<string, string>;
  readonly inputValidation: {
    readonly maxLength?: number;
    readonly bannedPatterns?: readonly string[];
  };
  readonly outputValidation: {
    readonly piiFilterPatterns?: readonly string[];
    readonly promptLeakPatterns?: readonly string[];
  };
  readonly providerExamples: Record<string, Record<string, unknown>>;
}

// ── Remediation Report (US-REM-08) ───────────────────────────

export interface RemediationReportAction {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly example: string;
  readonly priority: RemediationPriority;
  readonly effort: RemediationEffort;
  readonly article_ref: string;
  readonly affected_tests: number;
  readonly timeline: string;     // "this week", "next week", "this month", "backlog"
  readonly steps: readonly string[];
}

export interface RemediationReport {
  readonly score: number;
  readonly grade: string;
  readonly total_failures: number;
  readonly critical_gaps: readonly string[];
  readonly actions: readonly RemediationReportAction[];
  readonly system_prompt_patch?: string;
  readonly api_config_patch?: ApiConfigPatch;
  readonly timestamp: string;
}
