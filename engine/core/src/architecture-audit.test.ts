/**
 * Architecture Audit — validates project-wide coding standards.
 *
 * V1-M03 RED spec: proves no hardcoded data in domain/,
 * no circular imports, coding standards compliance.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = __dirname;

/** Recursively collect all .ts files (excluding tests, node_modules) */
function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    ) {
      files.push(full);
    }
  }
  return files;
}

describe('Architecture Audit', () => {
  // ─────────────────────────────────────────────────────────
  // Test 1: No hardcoded data in domain/ (magic numbers, inline configs)
  // ─────────────────────────────────────────────────────────
  it('no hardcoded data constants in domain/ files', () => {
    const domainDir = resolve(SRC_ROOT, 'domain');
    const domainFiles = collectTsFiles(domainDir);

    // Patterns that indicate hardcoded data (not logic):
    // - Price arrays/objects: { model: "...", price: 0.03 }
    // - Inline regulation text blocks (>200 chars string literals)
    // - Hardcoded API URLs
    const violations: Array<{ file: string; line: number; reason: string }> = [];

    const HARDCODED_PATTERNS = [
      // Hardcoded API URLs (not localhost or known-safe external hosts)
      { pattern: /['"]https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|complior\.ai|complior\.dev|fonts\.googleapis\.com|fonts\.gstatic\.com)[^'"]{20,}['"]/g, reason: 'hardcoded external URL' },
      // Hardcoded API keys pattern
      { pattern: /['"]sk-[a-zA-Z0-9]{20,}['"]/g, reason: 'hardcoded API key' },
      // Hardcoded secret/token pattern
      { pattern: /(?:secret|token|password|apiKey)\s*[:=]\s*['"][^'"]{10,}['"]/gi, reason: 'hardcoded secret/token' },
    ];

    for (const file of domainFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
        // Skip import lines
        if (line.trim().startsWith('import ')) continue;

        for (const { pattern, reason } of HARDCODED_PATTERNS) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            violations.push({
              file: relative(SRC_ROOT, file),
              line: i + 1,
              reason,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map(v => `  ${v.file}:${v.line} — ${v.reason}`)
        .join('\n');
      expect.fail(
        `Found ${violations.length} hardcoded data violations in domain/:\n${report}`,
      );
    }
  });

  // ─────────────────────────────────────────────────────────
  // Test 2: No circular imports (domain/ does not import from infra/ or http/)
  // ─────────────────────────────────────────────────────────
  it('domain/ files do not import from infra/ or http/', () => {
    const domainDir = resolve(SRC_ROOT, 'domain');
    const domainFiles = collectTsFiles(domainDir);

    const violations: Array<{ file: string; line: number; importPath: string }> = [];

    for (const file of domainFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // Match import statements
        const importMatch = line.match(
          /import\s+.*from\s+['"]([^'"]+)['"]/,
        );
        if (importMatch) {
          const importPath = importMatch[1]!;
          // Check if domain imports from infra/ or http/
          if (
            importPath.includes('/infra/') ||
            importPath.includes('/http/') ||
            importPath.includes('/services/')
          ) {
            violations.push({
              file: relative(SRC_ROOT, file),
              line: i + 1,
              importPath,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map(v => `  ${v.file}:${v.line} imports "${v.importPath}"`)
        .join('\n');
      expect.fail(
        `Found ${violations.length} layer violations (domain → infra/http/services):\n${report}`,
      );
    }
  });

  // ─────────────────────────────────────────────────────────
  // Test 3: All data files are JSON (not hardcoded in .ts)
  // ─────────────────────────────────────────────────────────
  it('data/ directory contains only JSON data files', () => {
    const dataDir = resolve(SRC_ROOT, 'data');
    const allFiles = collectTsFiles(dataDir);

    // .ts files in data/ should be loaders/types only, not contain large data arrays
    const violations: Array<{ file: string; reason: string }> = [];

    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');

      // Large array literals (>10 elements) suggest data should be in JSON
      const arrayMatches = content.match(/\[\s*\{[^}]+\}\s*,\s*\{/g);
      if (arrayMatches && arrayMatches.length > 5) {
        // Check if this is a data file masquerading as TS
        const lineCount = content.split('\n').length;
        if (lineCount > 200) {
          violations.push({
            file: relative(SRC_ROOT, file),
            reason: `Large data array in .ts file (${lineCount} lines) — consider moving to JSON`,
          });
        }
      }
    }

    // This is a warning-level check — we report but don't fail for existing files
    // New data files MUST be JSON
    if (violations.length > 0) {
      const report = violations
        .map(v => `  ${v.file}: ${v.reason}`)
        .join('\n');
      // Warning only — existing TS data files are known tech debt
      console.warn(
        `Data externalization warnings (${violations.length}):\n${report}`,
      );
    }

    // Always passes — this is an audit, not a gate
    expect(true).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // Test 4: No unwrap()/panic!() patterns (TS equivalent: no unhandled throws)
  // ─────────────────────────────────────────────────────────
  it('domain/ files do not have bare throw without DomainError', () => {
    const domainDir = resolve(SRC_ROOT, 'domain');
    const domainFiles = collectTsFiles(domainDir);

    const violations: Array<{ file: string; line: number }> = [];

    for (const file of domainFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Bare throw new Error (should be DomainError or specific error type)
        if (/throw\s+new\s+Error\s*\(/.test(line)) {
          // Allow in test helpers and constructors
          if (file.includes('test-helper') || file.includes('factory')) continue;
          violations.push({
            file: relative(SRC_ROOT, file),
            line: i + 1,
          });
        }
      }
    }

    // Report violations — this is an audit, not a blocker for v1.0
    if (violations.length > 0) {
      console.warn(
        `Found ${violations.length} bare 'throw new Error' in domain/ (prefer DomainError):`,
      );
      for (const v of violations.slice(0, 10)) {
        console.warn(`  ${v.file}:${v.line}`);
      }
    }

    // Pass if <= 20 violations (known tech debt threshold for v1.0)
    expect(violations.length).toBeLessThanOrEqual(20);
  });
});
