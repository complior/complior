import { watch, type FSWatcher } from 'node:fs';
import type { MiddlewareConfig } from '../types.js';
import { DEFAULT_CONFIG_PATH, loadProxyConfig, toMiddlewareConfig, mergeConfigs } from './proxy-config.js';

export interface ConfigWatcher {
  getConfig(): MiddlewareConfig;
  onChange(cb: (config: MiddlewareConfig) => void): void;
  close(): void;
}

const DEBOUNCE_MS = 100;

export const createConfigWatcher = (
  programmaticConfig: MiddlewareConfig,
  configPath?: string,
): ConfigWatcher => {
  const path = configPath ?? DEFAULT_CONFIG_PATH;
  let currentConfig = programmaticConfig;
  const listeners: Array<(config: MiddlewareConfig) => void> = [];
  let watcher: FSWatcher | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const reload = async (): Promise<void> => {
    const proxy = await loadProxyConfig(path);
    const fileBased = toMiddlewareConfig(proxy);
    currentConfig = mergeConfigs(programmaticConfig, fileBased);
    for (const cb of listeners) {
      cb(currentConfig);
    }
  };

  try {
    watcher = watch(path, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { void reload(); }, DEBOUNCE_MS);
    });
  } catch {
    // File doesn't exist yet — no watcher
  }

  // Initial load
  void reload();

  return {
    getConfig: () => currentConfig,
    onChange: (cb) => { listeners.push(cb); },
    close: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher?.close();
    },
  };
};
