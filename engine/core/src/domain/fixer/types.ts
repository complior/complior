import type { CheckResultType, Finding } from '../../types/common.types.js';

export type FixType = 'code_injection' | 'template_generation' | 'config_fix' | 'metadata_generation' | 'dependency_fix' | 'ai_enrichment';

export interface FixAction {
  readonly type: 'create' | 'edit' | 'splice';
  readonly path: string;
  readonly content?: string;           // create
  readonly oldContent?: string;        // edit
  readonly newContent?: string;        // edit
  readonly beforeLines?: readonly string[];  // splice: expected lines
  readonly afterLines?: readonly string[];   // splice: replacement lines
  readonly startLine?: number;               // splice: 1-based line
  readonly importLine?: string;              // splice: import to inject
  readonly description: string;
}

export interface FixPlan {
  readonly obligationId: string;
  readonly checkId: string;
  readonly article: string;
  readonly fixType: FixType;
  readonly framework: string;
  readonly actions: readonly FixAction[];
  readonly diff: string;
  readonly scoreImpact: number;
  readonly commitMessage: string;
  readonly description: string;
  readonly manualFields?: readonly string[];
}

export interface FixResult {
  readonly plan: FixPlan;
  readonly applied: boolean;
  readonly scoreBefore: number;
  readonly scoreAfter: number;
  readonly backedUpFiles: readonly string[];
  readonly error?: string;
}

export interface FixContext {
  readonly projectPath: string;
  readonly framework: string;
  readonly existingFiles: readonly string[];
  readonly useAi?: boolean;
}

export interface FixValidation {
  readonly checkId: string;
  readonly obligationId: string;
  readonly article: string;
  readonly before: CheckResultType;
  readonly after: CheckResultType;
  readonly scoreDelta: number;
  readonly totalScore: number;
}

export interface FixHistoryFile {
  readonly path: string;
  readonly action: 'create' | 'edit' | 'splice';
  readonly backupPath: string;
}

export interface FixHistoryEntry {
  readonly id: number;
  readonly checkId: string;
  readonly obligationId: string;
  readonly fixType: FixType;
  readonly status: 'applied' | 'undone';
  readonly timestamp: string;
  readonly files: readonly FixHistoryFile[];
  readonly scoreBefore: number;
  readonly scoreAfter: number;
}

export interface FixHistory {
  readonly fixes: readonly FixHistoryEntry[];
}

export type FixStrategy = (finding: Finding, context: FixContext) => FixPlan | null;

export interface TemplateMapping {
  readonly obligationId: string;
  readonly article: string;
  readonly templateFile: string;
  readonly outputFile: string;
  readonly description: string;
}
