/**
 * Maps scanner checkIds to obligation IDs they cover.
 * Single source of truth — used by obligations.route.ts and obligation-coverage builder.
 */
import checkToObligationsJson from '../../data/check-to-obligations.json' with { type: 'json' };

export const CHECK_TO_OBLIGATIONS: Readonly<Record<string, readonly string[]>> = checkToObligationsJson;

/** Build reverse mapping: obligation ID → check IDs. */
export const buildOblToChecks = (): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  for (const [checkId, oblIds] of Object.entries(CHECK_TO_OBLIGATIONS)) {
    for (const oblId of oblIds) {
      const existing = map.get(oblId) ?? [];
      existing.push(checkId);
      map.set(oblId, existing);
    }
  }
  return map;
};
