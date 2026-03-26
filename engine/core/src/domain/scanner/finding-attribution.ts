import type { Finding } from '../../types/common.types.js';
import type { ImportGraph } from './import-graph.js';

export interface AgentInfo {
  readonly name: string;
  readonly sourceFiles: readonly string[];
}

export interface FileOwnershipMap {
  readonly fileToOwner: ReadonlyMap<string, string>;   // file → sole agent
  readonly sharedFiles: ReadonlySet<string>;            // files reachable by 2+ agents
}

/**
 * BFS forward from each agent's sourceFiles through the import graph.
 * Files reachable by exactly 1 agent → owned by that agent.
 * Files reachable by 2+ agents → shared (project-level).
 */
export const buildFileOwnership = (
  agents: readonly AgentInfo[],
  importGraph: ImportGraph,
): FileOwnershipMap => {
  // reachable[file] = set of agent names that can reach it
  const reachableBy = new Map<string, Set<string>>();

  for (const agent of agents) {
    const visited = new Set<string>();
    const queue = [...agent.sourceFiles];

    // Seed: mark all sourceFiles as visited
    for (const sf of agent.sourceFiles) {
      visited.add(sf);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Record reachability
      if (!reachableBy.has(current)) reachableBy.set(current, new Set());
      reachableBy.get(current)!.add(agent.name);

      // BFS forward through imports
      const node = importGraph.nodes.get(current);
      if (!node) continue;
      for (const imp of node.imports) {
        if (!visited.has(imp)) {
          visited.add(imp);
          queue.push(imp);
        }
      }
    }
  }

  const fileToOwner = new Map<string, string>();
  const sharedFiles = new Set<string>();

  for (const [file, owners] of reachableBy) {
    if (owners.size === 1) {
      fileToOwner.set(file, owners.values().next().value!);
    } else {
      sharedFiles.add(file);
    }
  }

  return Object.freeze({ fileToOwner, sharedFiles });
};

/**
 * Compute common directory prefix of an agent's sourceFiles.
 * Returns '' if no common prefix.
 */
const computeAgentRoot = (sourceFiles: readonly string[]): string => {
  const dirs = sourceFiles
    .map(f => {
      const idx = f.lastIndexOf('/');
      return idx >= 0 ? f.substring(0, idx + 1) : '';
    })
    .filter(Boolean);

  if (dirs.length === 0) return '';

  let common = dirs[0];
  for (const d of dirs) {
    while (common && !d.startsWith(common)) {
      const trimmed = common.substring(0, common.length - 1);
      const slash = trimmed.lastIndexOf('/');
      common = slash >= 0 ? trimmed.substring(0, slash + 1) : '';
    }
  }
  return common;
};

/**
 * Build sorted (longest first) agent root directories for prefix fallback.
 */
const buildAgentRoots = (
  agents: readonly AgentInfo[],
): readonly { readonly name: string; readonly root: string }[] => {
  const roots: { name: string; root: string }[] = [];
  for (const agent of agents) {
    const root = computeAgentRoot(agent.sourceFiles);
    if (root) roots.push({ name: agent.name, root });
  }
  // Longest root first → most specific match wins
  roots.sort((a, b) => b.root.length - a.root.length);
  return roots;
};

/** Check IDs that require per-agent documents in multi-agent projects (EU AI Act per-AI-system). */
export const PER_AGENT_DOC_CHECK_IDS: ReadonlySet<string> = new Set([
  'fria',
  'risk-management',
  'technical-documentation',
  'declaration-of-conformity',
  'art5-screening',
  'instructions-for-use',
  'data-governance',
]);

/**
 * In multi-agent projects, expand project-level document-presence findings
 * into per-agent findings. Each agent needs its own compliance documents,
 * and each agent should receive credit for existing project-level docs.
 *
 * - agents.length ≤ 1 → no-op (single agent already gets all findings)
 * - PASS/FAIL/SKIP on per-agent checkId → N findings, one per agent with agentId
 */
export const expandPerAgentFindings = (
  findings: readonly Finding[],
  agents: readonly AgentInfo[],
): readonly Finding[] => {
  if (agents.length <= 1) return findings;

  const result: Finding[] = [];

  for (const f of findings) {
    if (!PER_AGENT_DOC_CHECK_IDS.has(f.checkId)) {
      result.push(f);
      continue;
    }

    // Expand doc findings to all agents — both passes and fails
    for (const agent of agents) {
      result.push({ ...f, agentId: agent.name });
    }
  }

  return result;
};

/**
 * Attribute findings to agents using import-graph ownership + directory prefix fallback.
 *
 * Algorithm:
 * - 0 agents → return as-is
 * - 1 agent  → all findings → that agent (fast path)
 * - N agents → graph-based ownership, then directory prefix fallback for non-code files
 */
export const attributeFindings = (
  findings: readonly Finding[],
  agents: readonly AgentInfo[],
  importGraph: ImportGraph,
): readonly Finding[] => {
  if (agents.length === 0) return findings;

  // Single agent → all findings belong to it
  if (agents.length === 1) {
    const sole = agents[0].name;
    return findings.map(f => ({ ...f, agentId: sole }));
  }

  // Multi-agent: graph-based ownership + directory prefix fallback
  const ownership = buildFileOwnership(agents, importGraph);
  const agentRoots = buildAgentRoots(agents);

  return findings.map(f => {
    // 1. No file (L1) → project-level
    if (!f.file) return f;

    // 2. Graph-based: sole owner
    const owner = ownership.fileToOwner.get(f.file);
    if (owner) return { ...f, agentId: owner };

    // 3. Shared file (reachable by 2+ agents) → project-level
    if (ownership.sharedFiles.has(f.file)) return f;

    // 4. Directory prefix fallback (for docs, configs not in import graph)
    for (const { name, root } of agentRoots) {
      if (f.file.startsWith(root)) return { ...f, agentId: name };
    }

    // 5. Root-level / unattributable → project-level
    return f;
  });
};
