/**
 * V1-M30.2 / HR-T4: RED — pure date-formatting helpers for human-readable display.
 *
 * `formatDateHuman(iso)` → "April 28, 2026"
 * `formatDateTimeHuman(iso)` → "April 28, 2026 at 10:48 UTC"
 *
 * Both must be:
 *   - Pure (deterministic, no side effects)
 *   - Locale-independent (use 'en-US' explicitly)
 *   - Safe on invalid input (return the input unchanged, never throw)
 */

import { describe, it, expect } from 'vitest';
import { formatDateHuman, formatDateTimeHuman } from './format-dates.js';

describe('V1-M30.2 HR-T4: formatDateHuman', () => {
  it('formats a full ISO datetime as "Month D, YYYY"', () => {
    expect(formatDateHuman('2026-04-28T10:48:32.816Z')).toBe('April 28, 2026');
  });

  it('formats an ISO date (no time) as "Month D, YYYY"', () => {
    expect(formatDateHuman('2026-08-02')).toBe('August 2, 2026');
  });

  it('returns the input unchanged when not a valid date', () => {
    expect(formatDateHuman('not-a-date')).toBe('not-a-date');
  });

  it('returns the input unchanged for empty string', () => {
    expect(formatDateHuman('')).toBe('');
  });

  it('is deterministic (same input → same output)', () => {
    const iso = '2026-12-31T23:59:59Z';
    expect(formatDateHuman(iso)).toBe(formatDateHuman(iso));
  });
});

describe('V1-M30.2 HR-T4: formatDateTimeHuman', () => {
  it('formats a full ISO datetime as "Month D, YYYY at HH:MM UTC"', () => {
    expect(formatDateTimeHuman('2026-04-28T10:48:32.816Z')).toBe('April 28, 2026 at 10:48 UTC');
  });

  it('handles midnight UTC correctly', () => {
    expect(formatDateTimeHuman('2026-08-02T00:00:00Z')).toBe('August 2, 2026 at 00:00 UTC');
  });

  it('returns the input unchanged when not a valid date', () => {
    expect(formatDateTimeHuman('not-a-date')).toBe('not-a-date');
  });

  it('returns the input unchanged for empty string', () => {
    expect(formatDateTimeHuman('')).toBe('');
  });

  it('is deterministic (same input → same output)', () => {
    const iso = '2026-04-28T10:48:32.816Z';
    expect(formatDateTimeHuman(iso)).toBe(formatDateTimeHuman(iso));
  });
});
