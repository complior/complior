import type { ScanContext } from '../../ports/scanner.port.js';
import type { ParsedDependency } from '../scanner/layers/layer3-parsers.js';
import type { DiscoveredAgent } from '../../types/passport.types.js';
import { AI_SDK_PACKAGES } from '../scanner/rules/banned-packages-sdk.js';

// --- Framework detection patterns ---

const FRAMEWORK_PATTERNS: ReadonlyMap<string, RegExp> = new Map([
  ['LangChain', /AgentExecutor|createReactAgent|createOpenAIFunctionsAgent/g],
  ['CrewAI', /Crew\(|@crew/g],
  ['Anthropic', /messages\.create|anthropic/g],
  ['OpenAI', /chat\.completions\.create|openai/g],
  ['Vercel AI', /generateText\(|streamText\(/g],
  ['LlamaIndex', /VectorStoreIndex|ServiceContext/g],
]);

// --- Model name detection ---

const MODEL_PATTERNS: readonly RegExp[] = [
  /claude-[\w.-]+/g,
  /gpt-[\w.-]+/g,
  /gemini-[\w.-]+/g,
  /llama-[\w.-]+/g,
  /mistral-[\w.-]+/g,
  /command-[\w.-]+/g,
];

// --- File filtering ---

const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.js', '.py', '.rs', '.go',
]);

const IGNORED_DIRS: ReadonlySet<string> = new Set([
  'node_modules', 'dist', '.git',
]);

const isSourceFile = (relativePath: string, extension: string): boolean => {
  if (!SOURCE_EXTENSIONS.has(extension)) return false;
  const parts = relativePath.split('/');
  return !parts.some((part) => IGNORED_DIRS.has(part));
};

// --- Framework detection ---

const detectFrameworks = (
  sourceFiles: readonly { readonly content: string }[],
): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const file of sourceFiles) {
    for (const [framework, pattern] of FRAMEWORK_PATTERNS) {
      pattern.lastIndex = 0;
      const matches = file.content.match(pattern);
      if (matches !== null) {
        counts.set(framework, (counts.get(framework) ?? 0) + matches.length);
      }
    }
  }

  return counts;
};

// --- Model detection ---

const detectModels = (
  sourceFiles: readonly { readonly content: string }[],
): readonly string[] => {
  const models = new Set<string>();

  for (const file of sourceFiles) {
    for (const pattern of MODEL_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(file.content)) !== null) {
        models.add(match[0]);
      }
    }
  }

  return [...models];
};

// --- Language detection ---

const detectLanguage = (
  sourceFiles: readonly { readonly extension: string }[],
): string => {
  const extCounts = new Map<string, number>();

  for (const file of sourceFiles) {
    extCounts.set(file.extension, (extCounts.get(file.extension) ?? 0) + 1);
  }

  let maxExt = '';
  let maxCount = 0;
  for (const [ext, count] of extCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxExt = ext;
    }
  }

  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.js': 'javascript',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
  };

  return langMap[maxExt] ?? 'unknown';
};

// --- Agent name inference ---

const inferAgentName = (ctx: ScanContext): string => {
  // Try to get name from package.json
  const pkgFile = ctx.files.find(
    (f) => f.relativePath === 'package.json',
  );

  if (pkgFile !== undefined) {
    try {
      const pkg: unknown = JSON.parse(pkgFile.content);
      if (
        typeof pkg === 'object' &&
        pkg !== null &&
        'name' in pkg &&
        typeof (pkg as Record<string, unknown>).name === 'string'
      ) {
        return (pkg as Record<string, string>).name;
      }
    } catch {
      // Fall through to directory name
    }
  }

  // Fall back to directory name
  const parts = ctx.projectPath.split('/');
  return parts[parts.length - 1] || 'unknown-agent';
};

// --- Main discovery function ---

export const discoverAgents = (
  ctx: ScanContext,
  deps: readonly ParsedDependency[],
): readonly DiscoveredAgent[] => {
  // 1. Filter deps to find AI SDKs
  const detectedSdks = deps
    .filter((dep) => AI_SDK_PACKAGES.has(dep.name))
    .map((dep) => dep.name);

  // If no SDK detected, return empty array
  if (detectedSdks.length === 0) return [];

  // 2. Get scannable source files
  const sourceFiles = ctx.files.filter((f) =>
    isSourceFile(f.relativePath, f.extension),
  );

  // 3. Detect framework patterns in source
  const frameworkCounts = detectFrameworks(sourceFiles);

  // 4. Detect model names
  const detectedModels = detectModels(sourceFiles);

  // 5. Determine primary framework (most matches wins)
  let primaryFramework = 'unknown';
  let maxMatches = 0;
  for (const [framework, count] of frameworkCounts) {
    if (count > maxMatches) {
      maxMatches = count;
      primaryFramework = framework;
    }
  }

  // If no framework found from patterns, try SDK name
  if (primaryFramework === 'unknown' && detectedSdks.length > 0) {
    const sdkLabel = AI_SDK_PACKAGES.get(detectedSdks[0]);
    if (sdkLabel !== undefined) {
      primaryFramework = sdkLabel;
    }
  }

  // 6. Determine language
  const language = detectLanguage(sourceFiles);

  // 7. Build agent name
  const name = inferAgentName(ctx);

  // 8. Find entry file (first source file with framework match, or first source file)
  let entryFile = sourceFiles[0]?.relativePath ?? '';
  for (const file of sourceFiles) {
    for (const [, pattern] of FRAMEWORK_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        entryFile = file.relativePath;
        break;
      }
    }
    if (entryFile !== (sourceFiles[0]?.relativePath ?? '')) break;
  }

  // 9. Calculate confidence
  const sdkCount = detectedSdks.length;
  const frameworkFound = primaryFramework !== 'unknown';
  const modelFound = detectedModels.length > 0;
  const confidence =
    0.5 +
    (sdkCount > 0 ? 0.2 : 0) +
    (frameworkFound ? 0.2 : 0) +
    (modelFound ? 0.1 : 0);

  // 10. Return one DiscoveredAgent per project (multi-agent detection later)
  return [
    {
      name,
      entryFile,
      framework: primaryFramework,
      language,
      detectedSdks,
      detectedModels,
      confidence,
    },
  ];
};
