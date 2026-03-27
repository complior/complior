// US-S05-24: Manifest Diff — compare passport versions and detect breaking changes

export interface ManifestDiffField {
  readonly field: string;
  readonly path: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly changeType: 'added' | 'removed' | 'modified';
  readonly severity: 'low' | 'medium' | 'high';
}

export interface ManifestDiffResult {
  readonly agentName: string;
  readonly totalChanges: number;
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly changes: readonly ManifestDiffField[];
  readonly hasBreakingChanges: boolean;
}

const HIGH_SEVERITY_FIELDS = new Set([
  'autonomy_level', 'permissions', 'constraints', 'compliance',
  'risk_class', 'prohibited_actions',
]);

const MEDIUM_SEVERITY_FIELDS = new Set([
  'model', 'owner', 'framework', 'logging', 'data_access',
]);

const fieldSeverity = (path: string): 'low' | 'medium' | 'high' => {
  const top = path.split('.')[0] ?? '';
  if (HIGH_SEVERITY_FIELDS.has(top)) return 'high';
  if (MEDIUM_SEVERITY_FIELDS.has(top)) return 'medium';
  return 'low';
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const diffObjects = (
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  prefix: string,
): ManifestDiffField[] => {
  const changes: ManifestDiffField[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (oldVal === undefined && newVal !== undefined) {
      changes.push({ field: key, path, oldValue: undefined, newValue: newVal, changeType: 'added', severity: fieldSeverity(path) });
    } else if (oldVal !== undefined && newVal === undefined) {
      changes.push({ field: key, path, oldValue: oldVal, newValue: undefined, changeType: 'removed', severity: fieldSeverity(path) });
    } else if (isRecord(oldVal) && isRecord(newVal)) {
      changes.push(...diffObjects(oldVal, newVal, path));
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, path, oldValue: oldVal, newValue: newVal, changeType: 'modified', severity: fieldSeverity(path) });
    }
  }

  return changes;
};

export const computeManifestDiff = (
  agentName: string,
  oldManifest: Record<string, unknown>,
  newManifest: Record<string, unknown>,
): ManifestDiffResult => {
  const changes = diffObjects(oldManifest, newManifest, '');

  const added = changes.filter(c => c.changeType === 'added').length;
  const removed = changes.filter(c => c.changeType === 'removed').length;
  const modified = changes.filter(c => c.changeType === 'modified').length;
  const hasBreakingChanges = changes.some(c => c.severity === 'high');

  return Object.freeze({
    agentName,
    totalChanges: changes.length,
    added,
    removed,
    modified,
    changes: Object.freeze(changes),
    hasBreakingChanges,
  });
};
