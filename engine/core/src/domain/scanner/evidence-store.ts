import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { Evidence } from './evidence.js';

// --- Types ---

export interface EvidenceEntry {
  readonly evidence: Evidence;
  readonly scanId: string;
  readonly chainPrev: string | null;
  readonly hash: string;
  readonly signature: string;
}

export interface EvidenceChain {
  readonly version: '1.0.0';
  readonly projectPath: string;
  readonly entries: readonly EvidenceEntry[];
  readonly lastHash: string;
}

export interface EvidenceChainSummary {
  readonly totalEntries: number;
  readonly scanCount: number;
  readonly firstEntry: string;
  readonly lastEntry: string;
  readonly chainValid: boolean;
  readonly uniqueFindings: number;
}

export interface EvidenceStore {
  readonly append: (evidence: readonly Evidence[], scanId: string) => Promise<void>;
  readonly getChain: () => Promise<EvidenceChain>;
  readonly verify: () => Promise<{ valid: boolean; brokenAt?: number }>;
  readonly getSummary: () => Promise<EvidenceChainSummary>;
}

// --- Helpers ---

const computeHash = (evidence: Evidence, scanId: string, chainPrev: string | null): string => {
  const payload = JSON.stringify({ evidence, scanId, chainPrev });
  return createHash('sha256').update(payload).digest('hex');
};

const EMPTY_CHAIN = (projectPath: string): EvidenceChain => ({
  version: '1.0.0',
  projectPath,
  entries: [],
  lastHash: '',
});

// --- Constants ---

/** Maximum entries before oldest are rotated out */
const MAX_ENTRIES = 1000;

/** Maximum file size in bytes before chain is reset (50 MB) */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// --- Factory ---

export const createEvidenceStore = (
  storePath: string,
  signHash: (hash: string) => string,
  verifyHash: (hash: string, signature: string) => boolean,
): EvidenceStore => {
  // In-memory cache of chain (lazy-loaded from disk)
  let cachedChain: EvidenceChain | null = null;

  const loadChain = async (): Promise<EvidenceChain> => {
    if (cachedChain) return cachedChain;

    const projectPath = dirname(dirname(dirname(storePath)));

    try {
      // Check file size before reading to avoid loading oversized chains
      const fileStat = await stat(storePath);
      if (fileStat.size > MAX_FILE_SIZE) {
        // Chain is oversized — reset with warning
        cachedChain = EMPTY_CHAIN(projectPath);
        return cachedChain;
      }

      const raw = await readFile(storePath, 'utf-8');
      const parsed = JSON.parse(raw) as EvidenceChain;

      // Validate basic structure
      if (!parsed || !Array.isArray(parsed.entries)) {
        cachedChain = EMPTY_CHAIN(projectPath);
        return cachedChain;
      }

      cachedChain = parsed;
      return cachedChain;
    } catch {
      cachedChain = EMPTY_CHAIN(projectPath);
      return cachedChain;
    }
  };

  const saveChain = async (chain: EvidenceChain): Promise<void> => {
    await mkdir(dirname(storePath), { recursive: true });
    await writeFile(storePath, JSON.stringify(chain, null, 2));
    cachedChain = chain;
  };

  const append = async (evidence: readonly Evidence[], scanId: string): Promise<void> => {
    const chain = await loadChain();
    const newEntries = [...chain.entries];
    let lastHash = chain.lastHash;

    for (const ev of evidence) {
      const chainPrev = lastHash || null;
      const hash = computeHash(ev, scanId, chainPrev);
      const signature = signHash(hash);

      newEntries.push(Object.freeze({
        evidence: ev,
        scanId,
        chainPrev,
        hash,
        signature,
      }));

      lastHash = hash;
    }

    // Rotate: keep only the newest MAX_ENTRIES entries
    const trimmedEntries = newEntries.length > MAX_ENTRIES
      ? newEntries.slice(newEntries.length - MAX_ENTRIES)
      : newEntries;

    const updated: EvidenceChain = {
      ...chain,
      entries: Object.freeze(trimmedEntries),
      lastHash,
    };

    await saveChain(updated);
  };

  const getChain = async (): Promise<EvidenceChain> => {
    return loadChain();
  };

  const verify = async (): Promise<{ valid: boolean; brokenAt?: number }> => {
    const chain = await loadChain();

    if (chain.entries.length === 0) {
      return { valid: true };
    }

    let expectedPrev: string | null = null;

    for (let i = 0; i < chain.entries.length; i++) {
      const entry = chain.entries[i]!;

      // Verify chain link
      if (entry.chainPrev !== (expectedPrev || null)) {
        return { valid: false, brokenAt: i };
      }

      // Verify hash
      const recomputedHash = computeHash(entry.evidence, entry.scanId, entry.chainPrev);
      if (entry.hash !== recomputedHash) {
        return { valid: false, brokenAt: i };
      }

      // Verify signature
      if (!verifyHash(entry.hash, entry.signature)) {
        return { valid: false, brokenAt: i };
      }

      expectedPrev = entry.hash;
    }

    return { valid: true };
  };

  const getSummary = async (): Promise<EvidenceChainSummary> => {
    const chain = await loadChain();
    const verification = await verify();

    if (chain.entries.length === 0) {
      return {
        totalEntries: 0,
        scanCount: 0,
        firstEntry: '',
        lastEntry: '',
        chainValid: verification.valid,
        uniqueFindings: 0,
      };
    }

    const scanIds = new Set(chain.entries.map(e => e.scanId));
    const findingIds = new Set(chain.entries.map(e => e.evidence.findingId));
    const timestamps = chain.entries.map(e => e.evidence.timestamp).sort();

    return {
      totalEntries: chain.entries.length,
      scanCount: scanIds.size,
      firstEntry: timestamps[0]!,
      lastEntry: timestamps[timestamps.length - 1]!,
      chainValid: verification.valid,
      uniqueFindings: findingIds.size,
    };
  };

  return Object.freeze({ append, getChain, verify, getSummary });
};
