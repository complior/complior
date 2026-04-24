/**
 * V1-M22 / C-1..C-4: RED test — zero `iso42001` references in engine source.
 *
 * Background:
 *   User decision: ISO 42001 deferred from v1.0.0. Code preserved in
 *   `archive/iso-42001` branch. Dev/main must have 0 references to iso42001.
 *
 * Specification:
 *   - engine/core/src has zero iso42001 occurrences (tested by walkTs)
 *   - engine/core/data/templates/iso-42001 directory absent
 *   - cli/src has zero iso42001 occurrences (Rust test)
 *
 * Architecture:
 *   - Filesystem scan from repo root
 *   - Tolerance for archive refs in `.md` docs explaining the archive
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_SRC = resolve(__dirname, '..');
const ENGINE_DATA = resolve(__dirname, '..', '..', 'data');

function walkTs(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walkTs(full, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      // Skip the test file itself (which contains the pattern as data)
      if (entry === 'no-iso42001-doc-types.test.ts') continue;
      files.push(full);
    }
  }
  return files;
}

describe('V1-M22 / C-1..C-4: ISO 42001 removed from engine source', () => {
  it('no *.ts file in engine/core/src/ references iso42001', () => {
    const files = walkTs(ENGINE_SRC);
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      // Case-insensitive match for iso42001 AND iso-42001 AND iso_42001
      if (/iso[_-]?42001/i.test(content)) {
        violations.push(file.replace(ENGINE_SRC, '<engine>'));
      }
    }
    expect(violations).toEqual([]);
  });

  it('engine/core/data/templates/iso-42001/ directory does not exist', () => {
    const dir = resolve(ENGINE_DATA, 'templates', 'iso-42001');
    expect(existsSync(dir)).toBe(false);
  });

  it('composition-root.ts has no iso42001 imports or bindings', () => {
    const compRoot = resolve(ENGINE_SRC, 'composition-root.ts');
    if (!existsSync(compRoot)) {
      throw new Error('composition-root.ts missing — impossible');
    }
    const content = readFileSync(compRoot, 'utf-8');
    expect(content).not.toMatch(/iso[_-]?42001/i);
  });

  it('document-generator.ts has no iso42001 doc types', () => {
    const file = resolve(ENGINE_SRC, 'domain', 'documents', 'document-generator.ts');
    if (!existsSync(file)) return; // fn may have been refactored
    const content = readFileSync(file, 'utf-8');
    expect(content).not.toMatch(/iso[_-]?42001/i);
  });

  it('template-registry.ts has no iso42001 entries', () => {
    const file = resolve(ENGINE_SRC, 'data', 'template-registry.ts');
    if (!existsSync(file)) return;
    const content = readFileSync(file, 'utf-8');
    expect(content).not.toMatch(/iso[_-]?42001/i);
  });
});
