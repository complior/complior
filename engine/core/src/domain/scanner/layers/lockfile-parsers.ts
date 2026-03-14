export interface LockfileDependency {
  readonly name: string;
  readonly version: string;
  readonly ecosystem: 'npm' | 'cargo' | 'go' | 'python';
  readonly isDirect: boolean;
  readonly license?: string;
}

interface PackageInfo {
  readonly version?: string;
  readonly license?: string;
  readonly dependencies?: Record<string, unknown>;
}

export const parsePackageLockJson = (content: string): readonly LockfileDependency[] => {
  try {
    const lock = JSON.parse(content) as Record<string, unknown>;
    const deps: LockfileDependency[] = [];

    // npm lockfile v2/v3 (packages format)
    const packages = lock.packages as Record<string, PackageInfo> | undefined;
    if (packages) {
      for (const [path, info] of Object.entries(packages)) {
        if (path === '') continue; // root package
        const name = path.replace('node_modules/', '').replace(/^.*node_modules\//, '');
        if (!name) continue;
        deps.push({
          name,
          version: info.version ?? 'unknown',
          ecosystem: 'npm',
          isDirect: !path.includes('node_modules/') || path.split('node_modules/').length === 2,
          license: info.license,
        });
      }
    }
    // npm lockfile v1 (dependencies format)
    else if (lock.dependencies) {
      const walkDeps = (obj: Record<string, unknown>, direct: boolean) => {
        for (const [name, raw] of Object.entries(obj)) {
          const info = raw as PackageInfo;
          deps.push({
            name,
            version: info.version ?? 'unknown',
            ecosystem: 'npm',
            isDirect: direct,
          });
          if (info.dependencies) {
            walkDeps(info.dependencies as Record<string, unknown>, false);
          }
        }
      };
      walkDeps(lock.dependencies as Record<string, unknown>, true);
    }
    return deps;
  } catch {
    return [];
  }
};

export const parseYarnLock = (content: string): readonly LockfileDependency[] => {
  const deps: LockfileDependency[] = [];
  // yarn.lock v1 format: "pkg@^version":\n  version "X.Y.Z"
  const blocks = content.split(/\n(?=\S)/);
  for (const block of blocks) {
    const headerMatch = block.match(/^"?(@?[^@\s"]+)@/);
    const versionMatch = block.match(/version\s+"([^"]+)"/);
    if (headerMatch && versionMatch) {
      deps.push({
        name: headerMatch[1],
        version: versionMatch[1],
        ecosystem: 'npm',
        isDirect: false, // yarn.lock doesn't distinguish
      });
    }
  }
  return deps;
};

export const parsePnpmLockYaml = (content: string): readonly LockfileDependency[] => {
  const deps: LockfileDependency[] = [];
  // Simple pnpm-lock.yaml parser (packages section)
  const lines = content.split('\n');
  let inPackages = false;
  for (const line of lines) {
    if (line.startsWith('packages:')) { inPackages = true; continue; }
    if (inPackages && /^\S/.test(line) && !line.startsWith(' ') && !line.startsWith('/')) {
      inPackages = false; continue;
    }
    if (inPackages) {
      // Format: /name@version: or /@scope/name@version:
      const match = line.match(/^\s+[/'"]?(@?[^@:'"]+)@([^:'"]+)/);
      if (match) {
        deps.push({
          name: match[1],
          version: match[2].replace(/['":]/g, ''),
          ecosystem: 'npm',
          isDirect: false,
        });
      }
    }
  }
  return deps;
};

export const parseCargoLock = (content: string): readonly LockfileDependency[] => {
  const deps: LockfileDependency[] = [];
  const blocks = content.split('[[package]]');
  for (const block of blocks) {
    const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
    const versionMatch = block.match(/version\s*=\s*"([^"]+)"/);
    if (nameMatch && versionMatch) {
      deps.push({
        name: nameMatch[1],
        version: versionMatch[1],
        ecosystem: 'cargo',
        isDirect: false, // Cargo.lock doesn't distinguish
      });
    }
  }
  return deps;
};

export const parseGoSum = (content: string): readonly LockfileDependency[] => {
  const deps: LockfileDependency[] = [];
  const seen = new Set<string>();
  for (const line of content.split('\n')) {
    const match = line.match(/^(\S+)\s+v([^\s/]+)/);
    if (match) {
      const key = `${match[1]}@${match[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deps.push({
        name: match[1],
        version: match[2],
        ecosystem: 'go',
        isDirect: false,
      });
    }
  }
  return deps;
};

export const parsePipfileLock = (content: string): readonly LockfileDependency[] => {
  try {
    const lock = JSON.parse(content) as Record<string, unknown>;
    const deps: LockfileDependency[] = [];
    for (const section of ['default', 'develop'] as const) {
      const packages = lock[section] as Record<string, PackageInfo> | undefined;
      if (!packages) continue;
      for (const [name, info] of Object.entries(packages)) {
        deps.push({
          name,
          version: (info.version ?? 'unknown').replace(/^==/, ''),
          ecosystem: 'python',
          isDirect: section === 'default',
        });
      }
    }
    return deps;
  } catch {
    return [];
  }
};

const LOCKFILE_PARSERS: Readonly<Record<string, (content: string) => readonly LockfileDependency[]>> = {
  'package-lock.json': parsePackageLockJson,
  'yarn.lock': parseYarnLock,
  'pnpm-lock.yaml': parsePnpmLockYaml,
  'Cargo.lock': parseCargoLock,
  'go.sum': parseGoSum,
  'Pipfile.lock': parsePipfileLock,
};

export const parseLockfiles = (files: readonly { relativePath: string; content: string }[]): readonly LockfileDependency[] => {
  const allDeps: LockfileDependency[] = [];
  for (const file of files) {
    const filename = file.relativePath.split('/').pop() ?? '';
    const parser = LOCKFILE_PARSERS[filename];
    if (parser) {
      allDeps.push(...parser(file.content));
    }
  }
  return allDeps;
};
