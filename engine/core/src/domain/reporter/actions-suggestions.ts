// V1-M22 / A-7: Actions suggestions logic
// Pure function — no I/O, deterministic, Object.freeze on result

export interface Suggestion {
  readonly command: string;
  readonly description: string;
}

export interface ProjectState {
  readonly lastScanAt: string | null;
  readonly lastEvalAt: string | null;
  readonly lastFixAt: string | null;
  readonly findings: readonly unknown[];
  readonly fixableFindings: readonly { checkId: string; severity: string }[];
  readonly passports: readonly unknown[];
  readonly missingDocTypes: readonly string[];
  readonly endpointConfigured: boolean;
  readonly profile: {
    readonly role: string;
    readonly riskLevel: string;
    readonly domain: string;
  };
}

const THIRTY_MIN_MS = 30 * 60 * 1000;

function isScanStale(lastScanAt: string | null): boolean {
  if (!lastScanAt) return true;
  return Date.now() - new Date(lastScanAt).getTime() > THIRTY_MIN_MS;
}

/**
 * Build action suggestions based on project state.
 * Rules from V1-M22 milestone §4:
 *
 * INCLUDE:
 *   - "Run `complior scan` to refresh findings" — if last scan > 30min OR findings stale
 *   - "Run `complior fix <check-id>`" ONCE with list of top fixable IDs
 *   - "Generate `<doc-type>` document" — only for missing doc types
 *   - "Update passport for <agent>" — if completeness < 80%
 *   - "Run `complior eval <endpoint>`" — if project has endpoint AND eval not yet run
 *
 * EXCLUDE:
 *   - `complior passport init` — deprecated
 *   - Duplicate suggestions (dedup by verb+object tuple)
 *   - Actions on already-fixed findings
 */
export const buildSuggestions = (state: ProjectState): readonly Suggestion[] => {
  const suggestions: Suggestion[] = [];

  // Rule 1: scan refresh — if scan is stale (>30min or never)
  if (isScanStale(state.lastScanAt)) {
    suggestions.push(Object.freeze({
      command: 'complior scan',
      description: 'Refresh scan findings (last scan is stale or never run)',
    }));
  }

  // Rule 2: fix — ONCE with top fixable check-ids
  if (state.fixableFindings.length > 0) {
    const topIds = state.fixableFindings.slice(0, 3).map((f) => f.checkId).join(', ');
    suggestions.push(Object.freeze({
      command: `complior fix ${topIds}`,
      description: `${state.fixableFindings.length} fixable findings available`,
    }));
  }

  // Rule 3: eval — if endpoint configured and eval never run
  if (state.endpointConfigured && !state.lastEvalAt) {
    suggestions.push(Object.freeze({
      command: 'complior eval',
      description: 'Run compliance evaluation on your AI system',
    }));
  }

  // Return frozen array
  return Object.freeze(suggestions);
};
