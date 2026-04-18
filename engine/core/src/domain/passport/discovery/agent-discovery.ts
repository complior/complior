import type { ScanContext } from '../../../ports/scanner.port.js';
import type { ParsedDependency } from '../../scanner/layers/layer3-parsers.js';
import type { DiscoveredAgent } from '../../../types/passport.types.js';
import { AI_SDK_PACKAGES } from '../../scanner/rules/banned-packages-sdk.js';
import { stripCommentsOnly } from '../../scanner/rules/comment-filter.js';

// --- Framework detection patterns ---

const FRAMEWORK_PATTERNS: ReadonlyMap<string, RegExp> = new Map([
  ['LangChain', /AgentExecutor|createReactAgent|createOpenAIFunctionsAgent|@langchain/g],
  ['CrewAI', /Crew\(|@crew|from crewai/g],
  ['AutoGen', /AssistantAgent|UserProxyAgent|GroupChat|from pyautogen/g],
  ['Anthropic', /messages\.create.*anthropic|@anthropic-ai\/sdk|from anthropic/g],
  ['OpenAI', /chat\.completions\.create|new OpenAI\(/g],
  ['Vercel AI', /generateText\(|streamText\(/g],
  ['LlamaIndex', /VectorStoreIndex|ServiceContext/g],
  ['Groq', /new Groq\(|groq-sdk/g],
  ['Ollama', /new Ollama\(|from ollama|ollama\.chat/g],
  ['Bedrock', /BedrockRuntimeClient|InvokeModelCommand|client-bedrock/g],
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

import { EXCLUDED_DIRS } from '../../scanner/constants.js';

const isSourceFile = (relativePath: string, extension: string): boolean => {
  if (!SOURCE_EXTENSIONS.has(extension)) return false;
  const parts = relativePath.split('/');
  return !parts.some((part) => EXCLUDED_DIRS.has(part));
};

// --- Per-file framework detection ---

interface FileFrameworkMatch {
  readonly relativePath: string;
  readonly content: string;
  readonly extension: string;
  readonly framework: string;
}

const detectFileFrameworks = (
  sourceFiles: readonly { readonly relativePath: string; readonly content: string; readonly extension: string }[],
): readonly FileFrameworkMatch[] => {
  const matches: FileFrameworkMatch[] = [];

  for (const file of sourceFiles) {
    for (const [framework, pattern] of FRAMEWORK_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        matches.push({ ...file, framework });
        break; // one framework per file (first match wins)
      }
    }
  }

  return matches;
};

// --- Model detection ---

const detectModels = (
  sourceFiles: readonly { readonly content: string; readonly extension: string }[],
): readonly string[] => {
  const models = new Set<string>();

  for (const file of sourceFiles) {
    // Strip comments first — model names in comments are false positives
    const stripped = stripCommentsOnly(file.content, file.extension);

    for (const pattern of MODEL_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(stripped)) !== null) {
        const candidate = match[0]!;
        // Check if this model name is part of an env var KEY (e.g. OPENAI_MODEL_KEY)
        const before = stripped.slice(Math.max(0, match.index - 12), match.index);
        const after = stripped.slice(match.index + candidate.length, match.index + candidate.length + 2);
        // Skip if preceded by uppercase letters + underscore (env var key) and followed by = or space=
        if (/[A-Z_]+\s*$/.test(before) && /(?:\s*=|,|$)/.test(after)) {
          continue; // likely an env var KEY, not a model value
        }
        models.add(candidate);
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

// --- Endpoint detection ---

interface DetectedEndpoint {
  readonly port: number;
  readonly routes: readonly string[];
}

const PORT_ENV_PATTERN = /^PORT\s*=\s*(\d+)/m;
const PORT_CODE_PATTERNS: readonly RegExp[] = [
  /port:\s*(\d{4,5})/,
  /\.listen\(\s*(\d{4,5})/,
  /Number\(.*?PORT.*?\?\?\s*(\d{4,5})\)/,
];
const ROUTE_PATTERN = /\.(?:post|get|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;

const detectEndpoints = (
  ctx: ScanContext,
  sourceFiles: readonly { readonly relativePath: string; readonly content: string }[],
): DetectedEndpoint | undefined => {
  let port: number | undefined;

  // 1. Try .env / .env.example for PORT
  const envFiles = ctx.files.filter(f =>
    f.relativePath === '.env' || f.relativePath === '.env.example',
  );
  for (const envFile of envFiles) {
    const match = PORT_ENV_PATTERN.exec(envFile.content);
    if (match) { port = Number(match[1]); break; }
  }

  // 1.5. Try Dockerfile for EXPOSE
  if (!port) {
    const dockerfile = ctx.files.find(f =>
      f.relativePath === 'Dockerfile' || f.relativePath === 'dockerfile',
    );
    if (dockerfile) {
      const match = /^EXPOSE\s+(\d{4,5})/m.exec(dockerfile.content);
      if (match) port = Number(match[1]);
    }
  }

  // 1.6. Try docker-compose.yml for ports mapping
  if (!port) {
    const compose = ctx.files.find(f =>
      f.relativePath === 'docker-compose.yml' || f.relativePath === 'docker-compose.yaml',
    );
    if (compose) {
      const match = /ports:\s*\n\s*-\s*['"]?(\d{4,5}):/m.exec(compose.content);
      if (match) port = Number(match[1]);
    }
  }

  // 2. Fallback: scan source files for port in code
  if (!port) {
    for (const file of sourceFiles) {
      for (const pattern of PORT_CODE_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(file.content);
        if (match) { port = Number(match[1]); break; }
      }
      if (port) break;
    }
  }

  if (!port) return undefined;

  // 3. Extract routes from source files
  const routes = new Set<string>();
  for (const file of sourceFiles) {
    ROUTE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ROUTE_PATTERN.exec(file.content)) !== null) {
      routes.add(match[1]);
    }
  }

  // Only include actual path routes (start with /) — exclude config getters like 'env', 'trust proxy'
  const filtered = [...routes].filter(r => r.startsWith('/'));
  return { port, routes: filtered };
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

  // 3. Detect per-file framework matches
  const fileMatches = detectFileFrameworks(sourceFiles);

  // 4. Group files by framework
  const byFramework = new Map<string, FileFrameworkMatch[]>();
  for (const match of fileMatches) {
    const group = byFramework.get(match.framework) ?? [];
    group.push(match);
    byFramework.set(match.framework, group);
  }

  // 5. Detect endpoints (port + routes) from .env and source files
  const endpointInfo = detectEndpoints(ctx, sourceFiles);
  const detectedEndpoints = endpointInfo
    ? endpointInfo.routes.length > 0
      ? endpointInfo.routes.map(r => `http://localhost:${endpointInfo.port}${r}`)
      : [`http://localhost:${endpointInfo.port}`]
    : undefined;

  // 6. If no frameworks detected from code patterns, fall back to single agent from SDK deps
  if (byFramework.size === 0) {
    const sdkLabel = AI_SDK_PACKAGES.get(detectedSdks[0]) ?? 'unknown';
    const name = inferAgentName(ctx);
    const language = detectLanguage(sourceFiles);
    return [{
      name,
      entryFile: sourceFiles[0]?.relativePath ?? '',
      framework: sdkLabel,
      language,
      detectedSdks,
      detectedModels: detectModels(sourceFiles),
      ...(detectedEndpoints ? { detectedEndpoints } : {}),
      confidence: 0.5 + (detectedSdks.length > 0 ? 0.2 : 0),
      sourceFiles: sourceFiles[0] ? [sourceFiles[0].relativePath] : [],
    }];
  }

  // 7. Build one DiscoveredAgent per framework
  const projectName = inferAgentName(ctx);
  const agents: DiscoveredAgent[] = [];

  for (const [framework, files] of byFramework) {
    const entryFile = files[0].relativePath;
    const language = detectLanguage(files);
    const models = detectModels(files);

    // Name: project-framework (lowercase, kebab-case)
    const frameworkSlug = framework.toLowerCase().replace(/\s+/g, '-');
    const name = byFramework.size === 1
      ? projectName
      : `${projectName}-${frameworkSlug}`;

    // Confidence: base 0.5 + SDK present + framework matched + model found
    const hasModel = models.length > 0;
    const confidence =
      0.5 +
      (detectedSdks.length > 0 ? 0.2 : 0) +
      0.2 + // framework always found here
      (hasModel ? 0.1 : 0);

    agents.push({
      name,
      entryFile,
      framework,
      language,
      detectedSdks,
      detectedModels: models,
      ...(detectedEndpoints ? { detectedEndpoints } : {}),
      confidence,
      sourceFiles: files.map(f => f.relativePath),
    });
  }

  return agents;
};
