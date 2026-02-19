import type { Finding } from '../../types/common.types.js';

export type FixType = 'code_injection' | 'template_generation' | 'config_fix' | 'metadata_generation';

export interface FixAction {
  readonly type: 'create' | 'edit';
  readonly path: string;
  readonly content?: string;
  readonly oldContent?: string;
  readonly newContent?: string;
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
}

export type FixStrategy = (finding: Finding, context: FixContext) => FixPlan | null;

export interface TemplateMapping {
  readonly obligationId: string;
  readonly article: string;
  readonly templateFile: string;
  readonly outputFile: string;
  readonly description: string;
}
