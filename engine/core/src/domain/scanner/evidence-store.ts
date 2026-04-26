import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { Evidence } from './evidence.js';
import type { EvidenceChain } from '../../types/common.types.js';
import { parseEvidenceChain } from '../../types/common.schemas.js';

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
  readonly verify: () => Promise<{ valid: boolean; brokenAt?: number; issues: readonly string[] }>;
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
      const parsed = parseEvidenceChain(raw);

      if (!parsed) {
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

    // Non-fatal: evidence write failure doesn't block scan completion
    try {
      await saveChain(updated);
    } catch { /* skip */ }
  };

  const getChain = async (): Promise<EvidenceChain> => {
    return loadChain();
  };

  const verify = async (): Promise<{ valid: boolean; brokenAt?: number; issues: readonly string[] }> => {
    const chain = await loadChain();

    if (chain.entries.length === 0) {
      return { valid: true, issues: [] };
    }

    const issues: string[] = [];
    let expectedPrev: string | null = null;

    for (let i = 0; i < chain.entries.length; i++) {
      const entry = chain.entries[i]!;

      // Verify chain link
      if (entry.chainPrev !== (expectedPrev || null)) {
        issues.push(`Entry ${i}: broken chain link (expected previous hash '${expectedPrev ?? 'null'}', got '${entry.chainPrev}')`);
        return { valid: false, brokenAt: i, issues };
      }

      // Verify hash
      const recomputedHash = computeHash(entry.evidence, entry.scanId, entry.chainPrev);
      if (entry.hash !== recomputedHash) {
        issues.push(`Entry ${i}: hash mismatch — evidence content may have been modified after recording`);
        return { valid: false, brokenAt: i, issues };
      }

      // Verify signature
      if (!verifyHash(entry.hash, entry.signature)) {
        issues.push(`Entry ${i}: signature verification failed — entry may have been tampered with`);
        return { valid: false, brokenAt: i, issues };
      }

      expectedPrev = entry.hash;
    }

    return { valid: true, issues: [] };
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

// --- Project-level factory (used by init-service) ---

/**
 * Creates an EvidenceStore for a given project path.
 * Uses HMAC-SHA256 for signing (suitable for testing; production may use ed25519).
 *
 * IMPORTANT: Must use the SAME path that runInit uses for signing.
 * runInit creates chain at: join(projectPath, '.complior', 'evidence', 'chain.json')
 * So projectPath here must be the same absolute path.
 */
export const createEvidenceStoreForProject = async (projectPath: string): Promise<{
  summary?: () => Promise<{ totalEntries: number }>;
  verify?: () => Promise<{ valid: boolean }>;
}> => {
  const { join } = await import('node:path');
  const { createHmac } = await import('node:crypto');
  const { readFile } = await import('node:fs/promises');

  // IMPORTANT: Use same path as runInit - absolute path to project root
  const chainPath = join(projectPath, '.complior', 'evidence', 'chain.json');

  // HMAC-based signing - use the same projectPath as runInit
  const signHash = (hash: string): string => {
    const key = `complior-evidence-${projectPath}`;
    return createHmac('sha256', key).update(hash).digest('hex');
  };

  const verifyHash = (hash: string, signature: string): boolean => {
    const expected = signHash(hash);
    return expected === signature;
  };

  // Create store with the chainPath (NOT projectPath)
  const store = createEvidenceStore(chainPath, signHash, verifyHash);

  // Return test-compatible interface
  // summary reads directly from file to avoid caching issues
  return {
    summary: async () => {
      try {
        const raw = await readFile(chainPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { totalEntries: parsed.entries?.length ?? 0 };
      } catch {
        return { totalEntries: 0 };
      }
    },
    verify: store.verify,
  };
};
