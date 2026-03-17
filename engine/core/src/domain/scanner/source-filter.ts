import { CODE_EXTENSIONS, STYLE_EXTENSIONS, EXCLUDED_DIRS } from './constants.js';

/** Extensions considered source files for L4 pattern matching (code + vue/html). */
const SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set([...CODE_EXTENSIONS, ...STYLE_EXTENSIONS]);

export const isSourceFile = (relativePath: string, extension: string): boolean => {
  if (!SCANNABLE_EXTENSIONS.has(extension)) return false;

  const parts = relativePath.split('/');
  if (parts.some((part) => EXCLUDED_DIRS.has(part))) return false;

  const filename = parts[parts.length - 1] ?? '';
  if (/\.(test|spec)\.\w+$/.test(filename)) return false;

  return true;
};

export const getLineNumber = (content: string, index: number): number => {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
};
