// V1-M22 / A-5: Document ID generator
// Pure function — deterministic, Object.freeze on result
// Counter persistence is a SEPARATE concern (handled by caller via doc-counter.json)

/**
 * Generate a document ID in format: {PREFIX}-{YYYY}-{NNN}
 * @param prefix - Document type prefix (TDD, INC, DOC, WRK, DGP, FRIA, AIL, MON, QMS)
 * @param year - 4-digit year
 * @param counter - 1-999 (zero-padded to 3 digits)
 * @throws Error if counter ≤ 0 or counter > 999
 */
export const generateDocumentId = (prefix: string, year: number, counter: number): string => {
  if (counter <= 0) throw new Error('Counter must be positive');
  if (counter > 999) throw new Error('Counter must be ≤ 999');
  const padded = counter.toString().padStart(3, '0');
  return `${prefix}-${year}-${padded}`;
};
