/**
 * V1-M30.8a / W-2: RED — passport file lookup uses `<name>-manifest.json` suffix
 * everywhere (not bare `<name>.json`).
 *
 * Daemon log evidence:
 *   [http] Unexpected error: Error: Agent 'eval-target-anthropic' not found in
 *   .complior/agents/ (ENOENT: no such file or directory, open
 *   '/tmp/deep-e2e/profile-C/eval-target/.complior/agents/eval-target-anthropic.json')
 *
 * Files are saved as `eval-target-anthropic-manifest.json` (verified in
 * `passport-service.ts:140` writePassport). Some lookup uses bare `.json`.
 *
 * This test scans the entire engine for any code path opening
 * `agentsDir/<name>.json` without the `-manifest` suffix.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ENGINE_ROOT = resolve(__dirname, '..', '..');

const collectTsFiles = (p: string): readonly string[] => {
  try {
    const s = statSync(p);
    if (s.isDirectory()) {
      return readdirSync(p)
        .filter((f) => !f.startsWith('.') && f !== 'node_modules' && f !== 'dist')
        .flatMap((f) => collectTsFiles(resolve(p, f)));
    }
    if (p.endsWith('.ts') && !p.endsWith('.test.ts')) return [p];
    return [];
  } catch { return []; }
};

describe('V1-M30.8a W-2: agent file lookup uses -manifest.json suffix', () => {
  it('no engine code opens `${agentsDir}/${name}.json` without -manifest suffix', () => {
    const files = collectTsFiles(resolve(ENGINE_ROOT, 'src'));
    const offending: { file: string; line: number; text: string }[] = [];
    // Pattern: backtick-template that constructs a path inside .complior/agents
    // ending in `.json` but NOT `-manifest.json`.
    const offendingRegex = /[\.\/]agents[\/`'"\s].*\$\{[^}]*\}\.json/;
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trimStart().startsWith('//')) continue;
        // Heuristic: any line that mentions agents/ AND ends with .json AND
        // does NOT contain `-manifest.json` AND has a template variable.
        if (/agents/i.test(line) && /\.json/.test(line) && !line.includes('-manifest.json')) {
          // Stricter check — the line must use a template variable for the name
          if (offendingRegex.test(line) || /agents.*\$\{[^}]*name[^}]*\}\.json/i.test(line)) {
            offending.push({ file: f, line: i + 1, text: line.trim().slice(0, 200) });
          }
        }
      }
    }
    if (offending.length > 0) {
      const detail = offending.map((o) => `  ${o.file}:${o.line}: ${o.text}`).join('\n');
      throw new Error(
        `V1-M30.8a W-2: ${offending.length} suspicious agent-file lookup(s) WITHOUT -manifest suffix:\n${detail}\n` +
          `All passport files are stored as <name>-manifest.json per FA-04 spec. Bare <name>.json is the bug.`,
      );
    }
    expect(offending).toHaveLength(0);
  });
});
