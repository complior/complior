import type { FixHistory, FixHistoryEntry } from './types.js';

export const createEmptyHistory = (): FixHistory => ({ fixes: [] });

export const addEntry = (history: FixHistory, entry: FixHistoryEntry): FixHistory => ({
  fixes: [...history.fixes, entry],
});

export const markUndone = (history: FixHistory, id: number): FixHistory => ({
  fixes: history.fixes.map((f) =>
    f.id === id ? { ...f, status: 'undone' as const } : f,
  ),
});

export const getLastApplied = (history: FixHistory): FixHistoryEntry | null => {
  for (let i = history.fixes.length - 1; i >= 0; i--) {
    if (history.fixes[i]!.status === 'applied') return history.fixes[i]!;
  }
  return null;
};

export const getById = (history: FixHistory, id: number): FixHistoryEntry | null =>
  history.fixes.find((f) => f.id === id) ?? null;
