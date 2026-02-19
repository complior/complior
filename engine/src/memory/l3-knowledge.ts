import type { RegulationData } from '../data/regulation-loader.js';

export interface KnowledgeDeps {
  readonly getRegulationData: () => RegulationData;
}

interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
}

const createLruCache = <T>(maxEntries: number = 100, ttlMs: number = 3600000) => {
  const entries = new Map<string, CacheEntry<T>>();
  let hits = 0;
  let misses = 0;

  const get = (key: string): T | null => {
    const entry = entries.get(key);
    if (!entry) { misses++; return null; }
    if (Date.now() - entry.timestamp > ttlMs) {
      entries.delete(key);
      misses++;
      return null;
    }
    hits++;
    // Move to end (LRU)
    entries.delete(key);
    entries.set(key, entry);
    return entry.data;
  };

  const set = (key: string, data: T): void => {
    if (entries.size >= maxEntries) {
      // Evict oldest (first key)
      const firstKey = entries.keys().next().value;
      if (firstKey !== undefined) entries.delete(firstKey);
    }
    entries.set(key, { data, timestamp: Date.now() });
  };

  const clear = (): void => { entries.clear(); hits = 0; misses = 0; };

  const stats = () => ({ hits, misses, size: entries.size });

  return Object.freeze({ get, set, clear, stats });
};

export const createKnowledgeTools = (deps: KnowledgeDeps) => {
  const { getRegulationData } = deps;
  const cache = createLruCache<unknown>();

  const lookupRegulation = (article: string): {
    found: boolean;
    obligations: readonly { id: string; title: string; description: string; severity: string; deadline: string }[];
  } => {
    const cacheKey = `regulation:${article.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as ReturnType<typeof lookupRegulation>;

    const data = getRegulationData();
    const query = article.toLowerCase();
    const matches = data.obligations.obligations.filter((o: any) =>
      o.article?.toLowerCase().includes(query) ||
      o.id?.toLowerCase().includes(query) ||
      o.title?.toLowerCase().includes(query),
    );

    const result = {
      found: matches.length > 0,
      obligations: matches.slice(0, 10).map((o: any) => ({
        id: o.id ?? '',
        title: o.title ?? '',
        description: o.description ?? '',
        severity: o.severity ?? 'medium',
        deadline: o.deadline ?? '',
      })),
    };

    cache.set(cacheKey, result);
    return result;
  };

  const lookupObligation = (obligationId: string): {
    found: boolean;
    obligation?: { id: string; article: string; title: string; description: string; severity: string; deadline: string; role: string };
  } => {
    const cacheKey = `obligation:${obligationId.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as ReturnType<typeof lookupObligation>;

    const data = getRegulationData();
    const match = data.obligations.obligations.find(
      (o: any) => o.id?.toLowerCase() === obligationId.toLowerCase(),
    );

    const result = match
      ? {
          found: true,
          obligation: {
            id: (match as any).id ?? '',
            article: (match as any).article ?? '',
            title: (match as any).title ?? '',
            description: (match as any).description ?? '',
            severity: (match as any).severity ?? 'medium',
            deadline: (match as any).deadline ?? '',
            role: (match as any).role ?? 'both',
          },
        }
      : { found: false };

    cache.set(cacheKey, result);
    return result;
  };

  const getApplicableRules = (
    riskLevel: string,
    role: string,
  ): { count: number; obligations: readonly { id: string; title: string; severity: string }[] } => {
    const cacheKey = `rules:${riskLevel}:${role}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as ReturnType<typeof getApplicableRules>;

    const data = getRegulationData();
    const filtered = data.obligations.obligations.filter((o: any) => {
      const roleMatch = o.role === 'both' || o.role === role;
      if (riskLevel === 'high') return roleMatch;
      if (riskLevel === 'limited') return roleMatch && o.severity !== 'low';
      if (riskLevel === 'minimal') return roleMatch && (o.severity === 'critical' || o.severity === 'high');
      return roleMatch;
    });

    const result = {
      count: filtered.length,
      obligations: filtered.map((o: any) => ({
        id: o.id ?? '',
        title: o.title ?? '',
        severity: o.severity ?? 'medium',
      })),
    };

    cache.set(cacheKey, result);
    return result;
  };

  const getCacheStats = () => cache.stats();
  const clearCache = () => cache.clear();

  return Object.freeze({ lookupRegulation, lookupObligation, getApplicableRules, getCacheStats, clearCache });
};

export type KnowledgeTools = ReturnType<typeof createKnowledgeTools>;
