import type { AgentPassport } from '../../types/passport.types.js';

export interface PermissionConflict {
  readonly type: 'denied_but_used' | 'overlapping_write' | 'self_contradiction';
  readonly agentA: string;
  readonly agentB?: string;
  readonly permission: string;
  readonly description: string;
}

export interface PermissionsMatrix {
  readonly agents: readonly string[];
  readonly permissions: readonly string[];
  readonly matrix: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  readonly conflicts: readonly PermissionConflict[];
}

const collectPermissions = (passports: readonly AgentPassport[]): string[] => {
  const all = new Set<string>();
  for (const p of passports) {
    for (const tool of p.permissions?.tools ?? []) all.add(tool);
    for (const denied of p.permissions?.denied ?? []) all.add(denied);
  }
  return [...all].sort();
};

const buildMatrix = (passports: readonly AgentPassport[], permissions: readonly string[]): Record<string, Record<string, boolean>> => {
  const matrix: Record<string, Record<string, boolean>> = {};
  for (const p of passports) {
    const toolSet = new Set(p.permissions?.tools ?? []);
    const deniedSet = new Set(p.permissions?.denied ?? []);
    const agentPerms: Record<string, boolean> = {};
    for (const perm of permissions) {
      agentPerms[perm] = toolSet.has(perm) && !deniedSet.has(perm);
    }
    matrix[p.name] = agentPerms;
  }
  return matrix;
};

const detectConflicts = (passports: readonly AgentPassport[]): PermissionConflict[] => {
  const conflicts: PermissionConflict[] = [];

  // self_contradiction: tool in both tools and denied
  for (const p of passports) {
    const toolSet = new Set(p.permissions?.tools ?? []);
    const deniedSet = new Set(p.permissions?.denied ?? []);
    for (const tool of toolSet) {
      if (deniedSet.has(tool)) {
        conflicts.push({
          type: 'self_contradiction',
          agentA: p.name,
          permission: tool,
          description: `Agent "${p.name}" has "${tool}" in both tools and denied lists`,
        });
      }
    }
  }

  // overlapping_write: 2+ agents write to same data entity
  const writeMap = new Map<string, string[]>();
  for (const p of passports) {
    for (const entity of p.permissions?.data_access?.write ?? []) {
      const writers = writeMap.get(entity) ?? [];
      writers.push(p.name);
      writeMap.set(entity, writers);
    }
  }
  for (const [entity, writers] of writeMap) {
    if (writers.length >= 2) {
      for (let i = 0; i < writers.length; i++) {
        for (let j = i + 1; j < writers.length; j++) {
          conflicts.push({
            type: 'overlapping_write',
            agentA: writers[i]!,
            agentB: writers[j],
            permission: entity,
            description: `Agents "${writers[i]}" and "${writers[j]}" both write to "${entity}"`,
          });
        }
      }
    }
  }

  // denied_but_used: agent A denies tool X, agent B uses tool X
  for (const a of passports) {
    const deniedSet = new Set(a.permissions?.denied ?? []);
    for (const b of passports) {
      if (a.name === b.name) continue;
      const toolSet = new Set(b.permissions?.tools ?? []);
      for (const tool of deniedSet) {
        if (toolSet.has(tool)) {
          conflicts.push({
            type: 'denied_but_used',
            agentA: a.name,
            agentB: b.name,
            permission: tool,
            description: `Agent "${a.name}" denies "${tool}", but agent "${b.name}" uses it`,
          });
        }
      }
    }
  }

  return conflicts;
};

export const buildPermissionsMatrix = (passports: readonly AgentPassport[]): PermissionsMatrix => {
  if (passports.length === 0) {
    return { agents: [], permissions: [], matrix: {}, conflicts: [] };
  }

  const permissions = collectPermissions(passports);

  return {
    agents: passports.map(p => p.name),
    permissions,
    matrix: buildMatrix(passports, permissions),
    conflicts: detectConflicts(passports),
  };
};
