/**
 * V1-M30.4 A.6: source icon helpers for the Actions tab.
 *
 * Maps an action's `source` field to a leading emoji so users can scan the
 * priority list visually. Pure functions, named exports, no side effects.
 */

const SOURCE_ICONS: Readonly<Record<string, string>> = Object.freeze({
  obligation: '\u{1F4CB}', // clipboard
  scan:       '\u{1F50D}', // magnifier
  document:   '\u{1F4C4}', // page
  passport:   '\u{1F916}', // robot
  eval:       '\u{1F9EA}', // test tube
});

/**
 * Return the leading emoji for an action source. Falls back to an empty
 * string when the source is unknown so the rendered output stays clean.
 */
export const sourceIcon = (source: string | undefined | null): string =>
  (source && SOURCE_ICONS[source]) || '';
