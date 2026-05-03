/**
 * V1-M27 / HR-1: Init service — auto-creates evidence chain after `complior init`.
 *
 * Background:
 *   Overview tab shows "Score capped: Evidence chain missing or invalid".
 *   V1-M22 A-8 spec'd this, but runtime didn't work. User sees mystic message.
 *
 * Specification:
 *   - After `complior init` completes successfully, evidence chain is valid
 *   - Re-running init is idempotent (doesn't break existing chain)
 *   - Chain has at least 1 genesis entry
 *   - Verification passes (`evidenceStore.verify()` → valid)
 *
 * Architecture:
 *   - Idempotent: skip if chain already valid
 *   - Genesis entry signed by HMAC key (project-level)
 *   - Persisted to .complior/evidence/chain.json
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import type { EvidenceChain } from '../types/common.types.js';
import type { EvidenceSource } from '../domain/scanner/evidence.js';

export interface InitOptions {
  readonly projectPath: string;
  readonly autoYes?: boolean;
}

// Evidence chain constants
const CHAIN_VERSION = '1.0.0';
const GENESIS_SCAN_ID = 'genesis-init';

/**
 * Creates a genesis evidence entry for a new project.
 */
const createGenesisEntry = (projectPath: string) => {
  const timestamp = new Date().toISOString();
  // Only include fields that EvidenceSchema accepts (Zod strips extras during load).
  // 'snippet' carries the human-readable init message.
  const evidence = {
    findingId: 'genesis',
    layer: 'init',
    timestamp,
    source: 'file-presence' as EvidenceSource,
    snippet: 'Project initialized with Complior',
    file: projectPath,
    line: 0,
  };

  // Genesis hash (no previous entry)
  const payload = JSON.stringify({ evidence, scanId: GENESIS_SCAN_ID, chainPrev: null });
  const hash = createHash('sha256').update(payload).digest('hex');

  // HMAC signature for genesis
  const hmacKey = `complior-evidence-${projectPath}`;
  const signature = createHmac('sha256', hmacKey).update(hash).digest('hex');

  return {
    evidence,
    scanId: GENESIS_SCAN_ID,
    chainPrev: null,
    hash,
    signature,
  };
};

/**
 * Initialize evidence chain for a project.
 * Idempotent — skips if chain already exists and is valid.
 */
export const runInit = async (opts: InitOptions): Promise<{ success: boolean; message: string }> => {
  return initInternal(opts);
};

/** Alias for runInit — used by V1-M29 W-1 production tests */
export const runInitForProject = async (opts: InitOptions): Promise<{ success: boolean; message: string }> => {
  return initInternal(opts);
};

const initInternal = async (opts: InitOptions): Promise<{ success: boolean; message: string }> => {
  const { projectPath } = opts;
  const evidenceDir = join(projectPath, '.complior', 'evidence');
  const chainPath = join(evidenceDir, 'chain.json');

  try {
    // Check if chain already exists and is valid
    try {
      const existing = await readFile(chainPath, 'utf-8');
      const chain = JSON.parse(existing) as EvidenceChain;

      // Verify chain validity
      if (chain.entries && chain.entries.length > 0) {
        // Chain exists with entries — verify it
        const { createEvidenceStoreForProject } = await import('../domain/scanner/evidence-store.js');
        const store = await createEvidenceStoreForProject(projectPath);
        const verification = await store.verify?.();

        if (verification?.valid) {
          // Chain is valid — idempotent skip
          return { success: true, message: 'Evidence chain already initialized and valid' };
        }
      }
    } catch {
      // Chain doesn't exist or is invalid — proceed with initialization
    }

    // Create .complior/evidence directory
    await mkdir(evidenceDir, { recursive: true });

    // Create genesis entry
    const genesisEntry = createGenesisEntry(projectPath);

    // Create initial chain
    const initialChain: EvidenceChain = {
      version: CHAIN_VERSION,
      projectPath,
      entries: [Object.freeze(genesisEntry)],
      lastHash: genesisEntry.hash,
    };

    // Persist chain
    await writeFile(chainPath, JSON.stringify(initialChain, null, 2), 'utf-8');

    // Verify the created chain
    const { createEvidenceStoreForProject } = await import('../domain/scanner/evidence-store.js');
    const store = await createEvidenceStoreForProject(projectPath);
    const verification = await store.verify?.();

    if (!verification?.valid) {
      return { success: false, message: `Evidence chain created but verification failed` };
    }

    return { success: true, message: 'Evidence chain initialized successfully' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to initialize evidence chain: ${message}` };
  }
};
