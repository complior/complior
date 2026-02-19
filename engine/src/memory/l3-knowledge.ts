import type { RegulationData } from '../data/regulation-loader.js';
import type { Obligation } from '../data/schemas.js';

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
    entries.delete(key);
    entries.set(key, entry);
    return entry.data;
  };

  const set = (key: string, data: T): void => {
    if (entries.size >= maxEntries) {
      const firstKey = entries.keys().next().value;
      if (firstKey !== undefined) entries.delete(firstKey);
    }
    entries.set(key, { data, timestamp: Date.now() });
  };

  const clear = (): void => { entries.clear(); hits = 0; misses = 0; };

  const stats = () => ({ hits, misses, size: entries.size });

  return Object.freeze({ get, set, clear, stats });
};

const matchesQuery = (o: Obligation, query: string): boolean =>
  o.article_reference.toLowerCase().includes(query) ||
  o.obligation_id.toLowerCase().includes(query) ||
  o.title.toLowerCase().includes(query);

export const createKnowledgeTools = (deps: KnowledgeDeps) => {
  const { getRegulationData } = deps;
  const regulationCache = createLruCache<ReturnType<typeof lookupRegulation>>();
  const obligationCache = createLruCache<ReturnType<typeof lookupObligation>>();
  const rulesCache = createLruCache<ReturnType<typeof getApplicableRules>>();

  const lookupRegulation = (article: string): {
    found: boolean;
    obligations: readonly { id: string; title: string; description: string; severity: string; deadline: string }[];
  } => {
    const cacheKey = `regulation:${article.toLowerCase()}`;
    const cached = regulationCache.get(cacheKey);
    if (cached) return cached;

    const data = getRegulationData();
    const query = article.toLowerCase();
    const matches = data.obligations.obligations.filter((o: Obligation) => matchesQuery(o, query));

    const result = {
      found: matches.length > 0,
      obligations: matches.slice(0, 10).map((o: Obligation) => ({
        id: o.obligation_id,
        title: o.title,
        description: o.description,
        severity: o.severity,
        deadline: o.deadline ?? '',
      })),
    };

    regulationCache.set(cacheKey, result);
    return result;
  };

  const lookupObligation = (obligationId: string): {
    found: boolean;
    obligation?: { id: string; article: string; title: string; description: string; severity: string; deadline: string; role: string };
  } => {
    const cacheKey = `obligation:${obligationId.toLowerCase()}`;
    const cached = obligationCache.get(cacheKey);
    if (cached) return cached;

    const data = getRegulationData();
    const match = data.obligations.obligations.find(
      (o: Obligation) => o.obligation_id.toLowerCase() === obligationId.toLowerCase(),
    );

    const result = match
      ? {
          found: true,
          obligation: {
            id: match.obligation_id,
            article: match.article_reference,
            title: match.title,
            description: match.description,
            severity: match.severity,
            deadline: match.deadline ?? '',
            role: match.applies_to_role,
          },
        }
      : { found: false };

    obligationCache.set(cacheKey, result);
    return result;
  };

  const getApplicableRules = (
    riskLevel: string,
    role: string,
  ): { count: number; obligations: readonly { id: string; title: string; severity: string }[] } => {
    const cacheKey = `rules:${riskLevel}:${role}`;
    const cached = rulesCache.get(cacheKey);
    if (cached) return cached;

    const data = getRegulationData();
    const filtered = data.obligations.obligations.filter((o: Obligation) => {
      const roleMatch = o.applies_to_role === 'both' || o.applies_to_role === role;
      if (riskLevel === 'high') return roleMatch;
      if (riskLevel === 'limited') return roleMatch && o.severity !== 'low';
      if (riskLevel === 'minimal') return roleMatch && (o.severity === 'critical' || o.severity === 'high');
      return roleMatch;
    });

    const result = {
      count: filtered.length,
      obligations: filtered.map((o: Obligation) => ({
        id: o.obligation_id,
        title: o.title,
        severity: o.severity,
      })),
    };

    rulesCache.set(cacheKey, result);
    return result;
  };

  const getCacheStats = () => ({
    regulation: regulationCache.stats(),
    obligation: obligationCache.stats(),
    rules: rulesCache.stats(),
  });
  const clearCache = () => { regulationCache.clear(); obligationCache.clear(); rulesCache.clear(); };

  return Object.freeze({ lookupRegulation, lookupObligation, getApplicableRules, getCacheStats, clearCache });
};

export type KnowledgeTools = ReturnType<typeof createKnowledgeTools>;
