/**
 * Minimal TOML parser for .complior/proxy.toml config files.
 * Handles: [section], key = "string", key = 123, key = true/false,
 * key = ["a", "b"], # comments (full-line and inline). No nested tables.
 */

type TOMLValue = string | number | boolean | string[];
type TOMLResult = Record<string, Record<string, TOMLValue>>;

/** Strip inline comment from a raw value, respecting quoted strings. */
const stripInlineComment = (raw: string): string => {
  // Quoted string — find closing quote, then strip comment after it
  if (raw.startsWith('"') || raw.startsWith("'")) {
    const quote = raw[0]!;
    const closeIdx = raw.indexOf(quote, 1);
    if (closeIdx !== -1) return raw.slice(0, closeIdx + 1).trim();
    return raw; // unterminated — return as-is
  }

  // Array — find closing ], strip comment after it
  if (raw.startsWith('[')) {
    const closeIdx = raw.lastIndexOf(']');
    if (closeIdx !== -1) return raw.slice(0, closeIdx + 1).trim();
    return raw;
  }

  // Unquoted — strip at first # preceded by whitespace
  const commentIdx = raw.search(/\s+#/);
  return commentIdx !== -1 ? raw.slice(0, commentIdx).trim() : raw;
};

export const parseTOML = (input: string): TOMLResult => {
  const result: TOMLResult = {};
  let currentSection = '';

  for (const rawLine of input.split('\n')) {
    const line = rawLine.trim();

    // Skip empty lines and full-line comments
    if (line === '' || line.startsWith('#')) continue;

    // Section header
    const sectionMatch = line.match(/^\[([a-zA-Z0-9_-]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1]!;
      if (!result[currentSection]) result[currentSection] = {};
      continue;
    }

    // Key = value
    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1]!;
    const rawValue = stripInlineComment(kvMatch[2]!.trim());

    if (!result[currentSection]) result[currentSection] = {};
    result[currentSection]![key] = parseValue(rawValue);
  }

  return result;
};

const parseValue = (raw: string): TOMLValue => {
  // Boolean
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // String (double or single quoted)
  const strMatch = raw.match(/^"(.*)"$/) ?? raw.match(/^'(.*)'$/);
  if (strMatch) return strMatch[1]!;

  // String array
  if (raw.startsWith('[')) {
    const inner = raw.slice(1, raw.lastIndexOf(']')).trim();
    if (inner === '') return [];
    return inner.split(',').map(item => {
      const trimmed = item.trim();
      const m = trimmed.match(/^"(.*)"$/) ?? trimmed.match(/^'(.*)'$/);
      return m ? m[1]! : trimmed;
    });
  }

  // Number
  const num = Number(raw);
  if (!Number.isNaN(num)) return num;

  // Fallback: treat as unquoted string
  return raw;
};
