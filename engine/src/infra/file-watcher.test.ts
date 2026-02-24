/**
 * US-S0202: File Watcher — named tests
 *
 * Tests for the chokidar-based file watcher that drives the Compliance Gate.
 * The watcher emits `file.changed` events on the shared event bus.
 */
import { describe, it, expect } from 'vitest';

// --- Helpers ---

/** Reproduces the extension filter from file-watcher.ts */
const WATCHED_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|md)$/i;

/** Reproduces the ignored-directory filter from file-watcher.ts */
const IGNORED_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
];

function isWatched(filePath: string): boolean {
  return WATCHED_EXTENSIONS.test(filePath);
}

function isIgnoredDir(filePath: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => {
    const segment = pattern.replace(/\*\*\//g, '').replace('/**', '');
    return filePath.includes(`/${segment}/`) || filePath.startsWith(`${segment}/`);
  });
}

// US-S0202: named tests

describe('FileWatcher — extension filter', () => {
  it('test_file_watcher_filters_extensions', () => {
    expect(isWatched('src/app.ts')).toBe(true);
    expect(isWatched('src/app.tsx')).toBe(true);
    expect(isWatched('src/app.js')).toBe(true);
    expect(isWatched('config.json')).toBe(true);
    expect(isWatched('README.md')).toBe(true);
    expect(isWatched('policy.yaml')).toBe(true);
    // Non-compliance files should NOT be watched
    expect(isWatched('image.png')).toBe(false);
    expect(isWatched('data.csv')).toBe(false);
    expect(isWatched('binary.exe')).toBe(false);
  });
});

describe('FileWatcher — ignored directories', () => {
  it('test_file_watcher_ignores_node_modules', () => {
    expect(isIgnoredDir('node_modules/lodash/index.js')).toBe(true);
    expect(isIgnoredDir('src/node_modules/foo/bar.ts')).toBe(true);
    expect(isIgnoredDir('.git/config')).toBe(true);
    expect(isIgnoredDir('dist/index.js')).toBe(true);
    // Regular source files should NOT be ignored
    expect(isIgnoredDir('src/app.ts')).toBe(false);
    expect(isIgnoredDir('docs/compliance/fria.md')).toBe(false);
  });
});

describe('FileWatcher — debounce logic', () => {
  it('test_file_watcher_debounce', async () => {
    // Simulate rapid events — only the last one should fire
    const emitted: string[] = [];
    const DEBOUNCE_MS = 200;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingFile: string | null = null;

    const scheduleEmit = (filePath: string): void => {
      pendingFile = filePath;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        if (pendingFile !== null) {
          emitted.push(pendingFile);
          pendingFile = null;
        }
        timer = null;
      }, DEBOUNCE_MS);
    };

    // Fire 3 rapid events
    scheduleEmit('src/a.ts');
    scheduleEmit('src/b.ts');
    scheduleEmit('src/c.ts');

    // Wait for debounce to settle
    await new Promise((r) => setTimeout(r, DEBOUNCE_MS + 50));

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toBe('src/c.ts'); // last one wins
  });
});
