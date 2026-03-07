export type PIICategory =
  | 'identity_national'
  | 'identity_passport'
  | 'financial'
  | 'contact'
  | 'medical'
  | 'gdpr_art9';

export interface PIIPattern {
  readonly id: string;
  readonly pattern: RegExp;
  readonly category: PIICategory;
  readonly label: string;
  readonly description: string;
  readonly validator?: (match: string) => boolean;
  readonly article?: string;
  readonly contextKeywords?: readonly string[];
}
