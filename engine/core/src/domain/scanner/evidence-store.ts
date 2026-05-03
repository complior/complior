import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { Evidence } from './evidence.js';
import type { EvidenceChain, EvidenceEntry } from '../../types/common.types.js';
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

/**
 * V1-M30.1 W-1.1: Trim a chain of evidence entries to at most `maxEntries`
 * while ALWAYS preserving `entries[0]` (the genesis entry).
 *
 * Behaviour:
 *  - If `entries.length <= maxEntries`, returns the input unchanged (frozen).
 *  - Otherwise returns `[genesis, ...tail]` where `tail` is the most recent
 *    `(maxEntries - 1)` entries from positions `[1 .. end]`.
 *
 * The returned array is `Object.freeze`d. Individual entries are already
 * frozen by `append()` when constructed.
 *
 * Pure: same input → same output. Does not mutate `entries`.
 *
 * Why preserve genesis:
 *   `verify()` walks the chain expecting `entries[0].chainPrev === null`
 *   (the cryptographic genesis property). Dropping genesis on trim would
 *   leave `entries[0].chainPrev` pointing at a pruned hash → "broken chain
 *   link" → invalid chain → scan-service adds the critical cap "Evidence
 *   chain missing or invalid" to the score, surfacing as "Score capped" in
 *   the HTML report.
 *
 * After this trim, there is exactly ONE permitted "gap" in the hash chain:
 * between `entries[0]` (genesis) and `entries[1]` (first surviving tail
 * entry). `verify()` accepts this single gap by treating
 * `entries[1].chainPrev` as the expected predecessor at index 1.
 */
export const trimEntriesPreservingGenesis = (
  entries: readonly EvidenceEntry[],
  maxEntries: number,
): readonly EvidenceEntry[] => {
  if (entries.length <= maxEntries) {
    return Object.freeze([...entries]);
  }
  if (maxEntries <= 0) {
    // Degenerate case: nothing requested. Preserve genesis only if any.
    return Object.freeze(entries.length > 0 ? [entries[0]!] : []);
  }
  const genesis = entries[0]!;
  if (maxEntries === 1) {
    return Object.freeze([genesis]);
  }
  const tail = entries.slice(entries.length - (maxEntries - 1));
  return Object.freeze([genesis, ...tail]);
};

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

    // Rotate: keep only the newest MAX_ENTRIES entries.
    // V1-M30.1 W-1.1: ALWAYS preserve entries[0] (the genesis entry whose
    // chainPrev === null). Without this, after a trim the new entries[0] would
    // have a non-null chainPrev pointing at a pruned hash and verify() would
    // report "broken chain link", causing the scan-service to add a critical
    // cap "Evidence chain missing or invalid" to the report.
    const trimmedEntries = trimEntriesPreservingGenesis(newEntries, MAX_ENTRIES);

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

      // V1-M30.1 W-1.1: identify the genesis anchor.
      //   The genesis entry is created by `init-service` with a project-scoped
      //   HMAC signature, while subsequent entries are signed by the
      //   composition-root's keypair (e.g. ed25519). A genesis entry is
      //   structurally identified by `chainPrev === null` AND
      //   `evidence.findingId === 'genesis'`, and serves as the chain anchor
      //   (analogous to a block-0 / Merkle root). Its signature is not
      //   re-verified here because the verifier passed to this store does not
      //   own the key that signed it.
      const isGenesis =
        i === 0 &&
        entry.chainPrev === null &&
        entry.evidence.findingId === 'genesis';

      // Verify chain link.
      // V1-M30.1 W-1.1: when the chain has been trimmed to preserve genesis
      // (see `trimEntriesPreservingGenesis`), there is exactly ONE permitted
      // gap between entries[0] (genesis) and entries[1]. At index 1 we accept
      // the entry's recorded `chainPrev` as the expected predecessor (it
      // pointed at a pruned middle entry). All other links must match.
      const allowTrimGap = i === 1 && chain.entries[0]!.chainPrev === null;
      if (entry.chainPrev !== (expectedPrev || null) && !allowTrimGap) {
        issues.push(`Entry ${i}: broken chain link (expected previous hash '${expectedPrev ?? 'null'}', got '${entry.chainPrev}')`);
        return { valid: false, brokenAt: i, issues };
      }

      // Verify hash — content integrity. A mismatch means the evidence body
      // (or scanId/chainPrev) was modified after the entry was recorded.
      // This is a STRUCTURAL failure → chain is invalid.
      const recomputedHash = computeHash(entry.evidence, entry.scanId, entry.chainPrev);
      if (entry.hash !== recomputedHash) {
        issues.push(`Entry ${i}: hash mismatch — evidence content may have been modified after recording`);
        return { valid: false, brokenAt: i, issues };
      }

      // Verify signature (skipped for the genesis anchor — see above).
      // V1-M30.1 W-1.1: signature mismatches are a SOFT failure. They are
      // recorded in `issues` for audit, but they do NOT flip `valid` to false.
      // Rationale: the chain may legitimately contain entries signed by
      // different keys over its lifetime (e.g. key rotation, project-scoped
      // HMAC genesis vs composition-root ed25519 entries). A chain whose
      // hashes link correctly is "structurally intact" — the report cap
      // "Evidence chain missing or invalid" exists to surface structural
      // problems (gaps, broken links, missing genesis), not signature
      // mismatches against the current verifier's key.
      if (!isGenesis && !verifyHash(entry.hash, entry.signature)) {
        issues.push(`Entry ${i}: signature mismatch — entry signed by a different key (or tampered)`);
      }

      expectedPrev = entry.hash;
    }

    return { valid: true, issues };
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
