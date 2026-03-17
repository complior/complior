import type { FileInfo } from '../../ports/scanner.port.js';
import { AI_PACKAGES } from './data/ai-packages.js';
import { AST_SUPPORTED_EXTENSIONS } from './constants.js';

export interface ImportGraphNode {
  readonly file: string;          // relative path
  readonly imports: readonly string[];  // resolved relative paths
  readonly isAiRelevant: boolean;       // imports AI SDK (directly or transitively)
  readonly aiRelevanceDepth: number;    // 0 = direct AI SDK import, 1 = imports file that imports SDK, etc.
}

export interface ImportGraph {
  readonly nodes: ReadonlyMap<string, ImportGraphNode>;
  readonly aiRelevantFiles: ReadonlySet<string>;
  readonly directAiFiles: ReadonlySet<string>;
}

// Regex patterns for import/require statements
const TS_IMPORT_REGEX = /(?:import\s+(?:(?:\{[^}]*\}|[\w*]+)\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
const PYTHON_IMPORT_REGEX = /(?:^import\s+([\w.]+)|^from\s+([\w.]+)\s+import)/gm;

/**
 * Extract import specifiers from a source file.
 * Returns raw import strings (not resolved).
 */
export const extractImports = (content: string, extension: string): readonly string[] => {
  const imports: string[] = [];

  if (AST_SUPPORTED_EXTENSIONS.has(extension)) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(TS_IMPORT_REGEX.source, 'g');
    while ((match = regex.exec(content)) !== null) {
      const spec = match[1] ?? match[2];
      if (spec) imports.push(spec);
    }
  } else if (extension === '.py') {
    let match: RegExpExecArray | null;
    const regex = new RegExp(PYTHON_IMPORT_REGEX.source, 'gm');
    while ((match = regex.exec(content)) !== null) {
      const spec = match[1] ?? match[2];
      if (spec) imports.push(spec);
    }
  }

  return imports;
};

/**
 * Check if an import specifier refers to a known AI SDK package.
 */
export const isAiPackageImport = (spec: string): boolean => {
  // Direct match
  if (AI_PACKAGES.has(spec)) return true;
  // Scoped package prefix match (e.g. '@ai-sdk/openai/something')
  const parts = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0] ?? '';
  if (AI_PACKAGES.has(parts)) return true;
  // Python dotted import (e.g. 'openai.chat')
  const pyRoot = spec.split('.')[0] ?? '';
  if (AI_PACKAGES.has(pyRoot)) return true;
  return false;
};

/**
 * Resolve a relative import to a file path within the project.
 * Returns undefined for external packages.
 */
const resolveImport = (
  spec: string,
  importerPath: string,
  fileSet: ReadonlySet<string>,
): string | undefined => {
  // External packages (not relative)
  if (!spec.startsWith('.') && !spec.startsWith('/')) return undefined;

  // Resolve relative to importer's directory
  const importerDir = importerPath.split('/').slice(0, -1).join('/');
  const parts = spec.split('/');
  const resolved: string[] = importerDir ? importerDir.split('/') : [];

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') { resolved.pop(); continue; }
    resolved.push(part);
  }

  let resolvedPath = resolved.join('/');
  // Strip .js/.ts extension from import and try variations
  resolvedPath = resolvedPath.replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');

  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
  for (const ext of extensions) {
    if (fileSet.has(resolvedPath + ext)) return resolvedPath + ext;
  }
  // Try index file
  for (const ext of extensions) {
    if (fileSet.has(resolvedPath + '/index' + ext)) return resolvedPath + '/index' + ext;
  }

  return undefined;
};

/**
 * Build an import graph from project files.
 * Identifies AI-relevant files through transitive import analysis.
 */
export const buildImportGraph = (files: readonly FileInfo[]): ImportGraph => {
  const fileSet = new Set(files.map((f) => f.relativePath));
  const nodes = new Map<string, ImportGraphNode>();

  // Phase 1: Extract imports and detect direct AI SDK imports
  const directAiFiles = new Set<string>();
  const importMap = new Map<string, string[]>(); // file -> resolved local imports

  for (const file of files) {
    const rawImports = extractImports(file.content, file.extension);
    const resolvedLocal: string[] = [];
    let hasDirectAi = false;

    for (const spec of rawImports) {
      if (isAiPackageImport(spec)) {
        hasDirectAi = true;
      }
      const resolved = resolveImport(spec, file.relativePath, fileSet);
      if (resolved) {
        resolvedLocal.push(resolved);
      }
    }

    importMap.set(file.relativePath, resolvedLocal);
    if (hasDirectAi) {
      directAiFiles.add(file.relativePath);
    }
  }

  // Phase 2: Propagate AI-relevance transitively (BFS from direct AI files)
  const aiRelevantFiles = new Set<string>(directAiFiles);
  const depthMap = new Map<string, number>();

  for (const f of directAiFiles) {
    depthMap.set(f, 0);
  }

  // Build reverse dependency graph (who imports this file?)
  const reverseImports = new Map<string, string[]>();
  for (const [file, imports] of importMap) {
    for (const imp of imports) {
      const existing = reverseImports.get(imp) ?? [];
      existing.push(file);
      reverseImports.set(imp, existing);
    }
  }

  // BFS from direct AI files through reverse imports
  const queue = [...directAiFiles];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depthMap.get(current) ?? 0;

    // Also check forward imports: if this file imports an AI file
    const forwardImports = importMap.get(current) ?? [];
    for (const imp of forwardImports) {
      if (aiRelevantFiles.has(imp) && !depthMap.has(current)) {
        aiRelevantFiles.add(current);
        depthMap.set(current, (depthMap.get(imp) ?? 0) + 1);
      }
    }

    // Propagate to files that import this AI-relevant file
    const importers = reverseImports.get(current) ?? [];
    for (const importer of importers) {
      if (!aiRelevantFiles.has(importer)) {
        aiRelevantFiles.add(importer);
        depthMap.set(importer, currentDepth + 1);
        queue.push(importer);
      }
    }
  }

  // Phase 3: Build final nodes
  for (const file of files) {
    const imports = importMap.get(file.relativePath) ?? [];
    const isRelevant = aiRelevantFiles.has(file.relativePath);
    const depth = depthMap.get(file.relativePath) ?? -1;

    nodes.set(file.relativePath, {
      file: file.relativePath,
      imports,
      isAiRelevant: isRelevant,
      aiRelevanceDepth: isRelevant ? depth : -1,
    });
  }

  return Object.freeze({
    nodes,
    aiRelevantFiles: Object.freeze(aiRelevantFiles),
    directAiFiles: Object.freeze(directAiFiles),
  });
};
