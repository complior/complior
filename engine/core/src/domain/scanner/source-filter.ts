import { SCANNABLE_EXTENSIONS, IGNORED_DIRS } from './rules/pattern-rules.js';

export const isSourceFile = (relativePath: string, extension: string): boolean => {
  if (!SCANNABLE_EXTENSIONS.has(extension)) return false;

  const parts = relativePath.split('/');
  if (parts.some((part) => IGNORED_DIRS.has(part))) return false;

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
