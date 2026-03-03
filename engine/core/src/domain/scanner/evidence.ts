export type EvidenceSource =
  | 'file-presence'
  | 'heading-match'
  | 'content-analysis'
  | 'dependency'
  | 'pattern-match'
  | 'llm-analysis'
  | 'cross-layer'
  | 'fix'
  | 'passport'
  | 'fria';

export interface Evidence {
  readonly findingId: string;
  readonly layer: string;
  readonly timestamp: string;
  readonly source: EvidenceSource;
  readonly snippet?: string;
  readonly file?: string;
  readonly line?: number;
}

export const createEvidence = (
  findingId: string,
  layer: string,
  source: EvidenceSource,
  opts?: {
    readonly snippet?: string;
    readonly file?: string;
    readonly line?: number;
  },
): Evidence => ({
  findingId,
  layer,
  timestamp: new Date().toISOString(),
  source,
  snippet: opts?.snippet,
  file: opts?.file,
  line: opts?.line,
});

export interface EvidenceCollector {
  readonly add: (evidence: Evidence) => void;
  readonly getAll: () => readonly Evidence[];
  readonly getByFinding: (findingId: string) => readonly Evidence[];
}

export const createEvidenceCollector = (): EvidenceCollector => {
  const items: Evidence[] = [];

  const add = (evidence: Evidence): void => {
    items.push(evidence);
  };

  const getAll = (): readonly Evidence[] => [...items];

  const getByFinding = (findingId: string): readonly Evidence[] =>
    items.filter((e) => e.findingId === findingId);

  return { add, getAll, getByFinding };
};
