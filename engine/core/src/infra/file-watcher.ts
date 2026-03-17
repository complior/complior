/**
 * File Watcher — watches project files and emits `file.changed` events.
 *
 * US-S0202: JS/TS/JSON file change → debounce 200 ms → compliance gate re-scan.
 *
 * Uses chokidar for cross-platform fs watching (Linux inotify / macOS FSEvents).
 * Ignores node_modules, .git, dist, build, coverage, and hidden directories.
 */
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from './logger.js';
import type { EventBus } from './event-bus.js';
import { EXCLUDED_DIRS } from '../data/scanner-constants.js';

const log = createLogger('file-watcher');

/** File extensions that can affect compliance score. */
const WATCHED_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|md)$/i;

/** Check if a file path should be ignored (any segment matches EXCLUDED_DIRS). */
const isIgnored = (filePath: string): boolean => {
  const segments = filePath.split('/');
  return segments.some((s) => EXCLUDED_DIRS.has(s));
};

/** Debounce interval matching the 200ms Compliance Gate requirement. */
const DEBOUNCE_MS = 200;

export interface FileWatcher {
  start: () => void;
  stop: () => Promise<void>;
}

/**
 * Create a file watcher for the given project directory.
 *
 * Call `start()` to begin watching; the watcher emits `file.changed` on the
 * shared event bus whenever a relevant file is created or modified.
 */
export const createFileWatcher = (
  projectPath: string,
  events: EventBus,
): FileWatcher => {
  let watcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingFile: string | null = null;

  const scheduleEmit = (filePath: string): void => {
    pendingFile = filePath;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      if (pendingFile !== null) {
        log.info(`File changed: ${pendingFile} — triggering compliance gate`);
        events.emit('file.changed', { path: pendingFile, action: 'edit' });
        pendingFile = null;
      }
      debounceTimer = null;
    }, DEBOUNCE_MS);
  };

  const start = (): void => {
    if (watcher !== null) {
      log.warn('File watcher already running');
      return;
    }

    watcher = chokidar.watch(projectPath, {
      ignored: isIgnored,
      persistent: true,
      ignoreInitial: true,       // don't fire on startup
      awaitWriteFinish: {
        stabilityThreshold: 100, // wait 100 ms after last write
        pollInterval: 50,
      },
    });

    watcher
      .on('add', (filePath: string) => {
        if (WATCHED_EXTENSIONS.test(filePath) && !isIgnored(filePath)) scheduleEmit(filePath);
      })
      .on('change', (filePath: string) => {
        if (WATCHED_EXTENSIONS.test(filePath) && !isIgnored(filePath)) scheduleEmit(filePath);
      })
      .on('error', (err: unknown) => {
        log.error('File watcher error:', err);
      })
      .on('ready', () => {
        log.info(`Watching ${projectPath} for compliance-relevant changes`);
      });
  };

  const stop = async (): Promise<void> => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (watcher !== null) {
      await watcher.close();
      watcher = null;
      log.info('File watcher stopped');
    }
  };

  return { start, stop };
};
