import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
// search utilities

const execFileAsync = promisify(execFile);

export interface SearchResult {
  readonly file: string;
  readonly line: number;
  readonly content: string;
}

const ripgrepSearch = async (
  pattern: string,
  searchPath: string,
): Promise<readonly SearchResult[]> => {
  try {
    const { stdout } = await execFileAsync('rg', [
      '--json',
      '--max-count', '50',
      '--max-filesize', '1M',
      '-g', '!node_modules',
      '-g', '!.git',
      '-g', '!dist',
      pattern,
      searchPath,
    ], { timeout: 10_000, maxBuffer: 5 * 1024 * 1024 });

    const results: SearchResult[] = [];

    for (const line of stdout.split('\n')) {
      if (line.trim() === '') continue;
      try {
        const parsed = JSON.parse(line) as { type: string; data?: { path?: { text?: string }; line_number?: number; lines?: { text?: string } } };
        if (parsed.type === 'match' && parsed.data !== undefined) {
          results.push({
            file: parsed.data.path?.text ?? '',
            line: parsed.data.line_number ?? 0,
            content: parsed.data.lines?.text?.trim() ?? '',
          });
        }
      } catch {
        // skip malformed JSON lines
      }
    }

    return results;
  } catch {
    return [];
  }
};

const SEARCH_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json', '.html']);

const nativeSearch = async (
  pattern: string,
  searchPath: string,
): Promise<readonly SearchResult[]> => {
  const results: SearchResult[] = [];
  const regex = new RegExp(pattern, 'gi');

  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 8 || results.length > 50) return;

    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (results.length > 50) break;
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile() && SEARCH_EXTENSIONS.has(extname(entry.name))) {
        try {
          const content = await readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i] ?? '')) {
              results.push({ file: fullPath, line: i + 1, content: (lines[i] ?? '').trim() });
            }
            regex.lastIndex = 0;
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  };

  await walk(searchPath, 0);
  return results;
};

export const search = async (
  pattern: string,
  searchPath: string,
): Promise<readonly SearchResult[]> => {
  // Try ripgrep first, fall back to native
  const rgResults = await ripgrepSearch(pattern, searchPath);
  if (rgResults.length > 0) {
    return rgResults;
  }

  return nativeSearch(pattern, searchPath);
};
