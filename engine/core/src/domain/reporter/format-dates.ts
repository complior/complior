/**
 * V1-M30.2 / HR-T4 — pure, deterministic date-formatting helpers for human-readable display.
 *
 * Both helpers:
 *   - are pure (no side effects, deterministic for a given input);
 *   - render in a fixed locale (`en-US`) so output is independent of the host locale;
 *   - return the input unchanged when the supplied string cannot be parsed as a date
 *     (no exception is ever thrown — render layer can therefore call them unconditionally).
 *
 * Time-of-day output is always normalized to UTC to keep the rendered HTML reproducible
 * across machines and CI runners (no timezone drift on report.html).
 */

/**
 * Format an ISO-8601 date or datetime as `Month D, YYYY` (e.g. `April 28, 2026`).
 * Locale-pinned to `en-US`; UTC-pinned for date components.
 *
 * @param iso - An ISO-8601 string (`YYYY-MM-DD` or full datetime with timezone).
 * @returns Human-readable date string, or `iso` unchanged if the input is not parseable.
 */
export const formatDateHuman = (iso: string): string => {
  if (!iso) return iso;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const fmt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return fmt.format(new Date(ms));
};

/**
 * Format an ISO-8601 datetime as `Month D, YYYY at HH:MM UTC`
 * (e.g. `April 28, 2026 at 10:48 UTC`).
 * Locale-pinned to `en-US`; UTC-pinned for both date and time components.
 *
 * @param iso - An ISO-8601 datetime string.
 * @returns Human-readable timestamp string, or `iso` unchanged if the input is not parseable.
 */
export const formatDateTimeHuman = (iso: string): string => {
  if (!iso) return iso;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const date = new Date(ms);
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return `${dateFmt.format(date)} at ${timeFmt.format(date)} UTC`;
};
