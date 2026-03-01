export interface ParsedDependency {
  readonly name: string;
  readonly version: string;
  readonly ecosystem: string;
}

const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

export const parsePackageJson = (content: string): readonly ParsedDependency[] => {
  try {
    const raw: unknown = JSON.parse(content);
    const pkg = isRec(raw) ? raw : {};
    const deps: ParsedDependency[] = [];
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      const section = pkg[field];
      if (isRec(section)) {
        for (const [name, rawVersion] of Object.entries(section)) {
          deps.push({ name, version: String(rawVersion), ecosystem: 'npm' });
        }
      }
    }
    return deps;
  } catch {
    return [];
  }
};

export const parseRequirementsTxt = (content: string): readonly ParsedDependency[] => {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('-'))
    .map((line) => {
      const match = line.match(/^([a-zA-Z0-9_.-]+)\s*(?:[>=<~!]+\s*(.+))?$/);
      if (match === null) return null;
      return { name: match[1], version: match[2] ?? '*', ecosystem: 'pip' };
    })
    .filter((d): d is ParsedDependency => d !== null);
};

export const parseCargoToml = (content: string): readonly ParsedDependency[] => {
  const deps: ParsedDependency[] = [];
  const depSection = /\[dependencies\]([\s\S]*?)(?:\[|$)/;
  const match = content.match(depSection);
  if (match === null) return deps;

  const lines = match[1].split('\n');
  for (const line of lines) {
    const depMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"?([^"}\s]+)"?/);
    if (depMatch !== null) {
      deps.push({ name: depMatch[1], version: depMatch[2], ecosystem: 'cargo' });
    }
  }
  return deps;
};

export const parseGoMod = (content: string): readonly ParsedDependency[] => {
  const deps: ParsedDependency[] = [];
  const requireBlock = /require\s*\(([\s\S]*?)\)/;
  const match = content.match(requireBlock);
  const lines = match !== null
    ? match[1].split('\n')
    : content.split('\n');

  for (const line of lines) {
    const depMatch = line.trim().match(/^([\w./\-@]+)\s+(v[\d.]+)/);
    if (depMatch !== null) {
      deps.push({ name: depMatch[1], version: depMatch[2], ecosystem: 'go' });
    }
  }
  return deps;
};
