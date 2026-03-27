import type { ScanContext } from '../../../ports/scanner.port.js';

// --- Types ---

export interface DiscoveredPermissions {
  readonly tools: readonly string[];
  readonly dataAccess: {
    readonly read: readonly string[];
    readonly write: readonly string[];
    readonly delete: readonly string[];
  };
  readonly denied: readonly string[];
  readonly mcpServers: readonly {
    readonly name: string;
    readonly tools_allowed: readonly string[];
  }[];
  readonly humanApprovalRequired: readonly string[];
}

export type ToolFramework = 'langchain' | 'crewai' | 'openai' | 'anthropic' | 'mcp' | 'vercel-ai' | 'generic';

export interface DiscoveredTool {
  readonly name: string;
  readonly framework: ToolFramework;
  readonly file: string;
  readonly line: number;
}

export interface DiscoveredPermissionsDetailed extends DiscoveredPermissions {
  readonly toolsDetailed: readonly DiscoveredTool[];
}

// --- File filtering ---

const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.js', '.py']);

import { EXCLUDED_DIRS } from '../../scanner/constants.js';

const isSourceFile = (relativePath: string, extension: string): boolean => {
  if (!SOURCE_EXTENSIONS.has(extension)) return false;
  const parts = relativePath.split('/');
  return !parts.some((part) => EXCLUDED_DIRS.has(part));
};

// --- Tool detection ---

const TOOL_DEFINITION_PATTERNS: readonly RegExp[] = [
  /tools:\s*\[/g,
  /@tool/g,
  /tool_use/g,
  /function_call/g,
  /tool_choice/g,
];

const TOOL_NAME_PATTERN = /name:\s*['"](\w+)['"]/g;

const detectTools = (
  sourceFiles: readonly { readonly content: string }[],
): string[] => {
  const tools = new Set<string>();

  for (const file of sourceFiles) {
    // Check if file has tool-related patterns
    let hasToolPattern = false;
    for (const pattern of TOOL_DEFINITION_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        hasToolPattern = true;
        break;
      }
    }

    if (!hasToolPattern) continue;

    // Extract tool names near tool definitions
    TOOL_NAME_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TOOL_NAME_PATTERN.exec(file.content)) !== null) {
      tools.add(match[1]);
    }
  }

  return [...tools];
};

// --- Data access detection (database, file I/O, HTTP) ---

interface DataAccessPatterns {
  readonly read: readonly RegExp[];
  readonly write: readonly RegExp[];
  readonly delete: readonly RegExp[];
}

const DB_PATTERNS: readonly RegExp[] = [
  /\.find\(/g, /\.findOne\(/g, /\.findMany\(/g, /SELECT\s/g, /\.get\(/g, /\.query\(/g,
];

const FILE_READ_PATTERNS: readonly RegExp[] = [
  /readFile\(/g, /readFileSync\(/g, /createReadStream\(/g,
];

const FILE_WRITE_PATTERNS: readonly RegExp[] = [
  /writeFile\(/g, /writeFileSync\(/g, /appendFile\(/g, /createWriteStream\(/g,
];

const FILE_DELETE_PATTERNS: readonly RegExp[] = [
  /unlink\(/g, /unlinkSync\(/g, /rmSync\(/g,
];

const HTTP_READ_PATTERNS: readonly RegExp[] = [
  /fetch\(/g, /axios\.get\(/g, /http\.get\(/g, /http\.request\(/g,
];

const HTTP_WRITE_PATTERNS: readonly RegExp[] = [
  /axios\.post\(/g, /axios\.put\(/g, /axios\.patch\(/g,
];

const HTTP_DELETE_PATTERNS: readonly RegExp[] = [
  /axios\.delete\(/g,
];

const DATA_ACCESS_PATTERNS: DataAccessPatterns = {
  read: [...DB_PATTERNS, ...FILE_READ_PATTERNS, ...HTTP_READ_PATTERNS],
  write: [
    /\.create\(/g, /\.update\(/g, /\.upsert\(/g, /INSERT\s/g, /UPDATE\s/g, /\.put\(/g, /\.set\(/g,
    ...FILE_WRITE_PATTERNS, ...HTTP_WRITE_PATTERNS,
  ],
  delete: [
    /\.delete\(/g, /\.remove\(/g, /DELETE\s/g, /\.destroy\(/g,
    ...FILE_DELETE_PATTERNS, ...HTTP_DELETE_PATTERNS,
  ],
};

const ENTITY_PATTERN = /(?:prisma|db|model|collection)\.(\w+)\./g;

const ALL_FILE_PATTERNS: readonly RegExp[] = [
  ...FILE_READ_PATTERNS, ...FILE_WRITE_PATTERNS, ...FILE_DELETE_PATTERNS,
];

const ALL_HTTP_PATTERNS: readonly RegExp[] = [
  ...HTTP_READ_PATTERNS, ...HTTP_WRITE_PATTERNS, ...HTTP_DELETE_PATTERNS,
];

const matchPatterns = (
  content: string,
  patterns: readonly RegExp[],
): boolean => {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) return true;
  }
  return false;
};

const inferAccessLabel = (content: string): string => {
  if (matchPatterns(content, ALL_FILE_PATTERNS)) return 'filesystem';
  if (matchPatterns(content, ALL_HTTP_PATTERNS)) return 'network';
  return 'database';
};

const collectEntities = (content: string): ReadonlySet<string> => {
  const entities = new Set<string>();
  ENTITY_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENTITY_PATTERN.exec(content)) !== null) {
    entities.add(match[1]);
  }
  return entities;
};

const addMatchedAccess = (
  content: string,
  patterns: readonly RegExp[],
  entities: ReadonlySet<string>,
  target: Set<string>,
): void => {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      if (entities.size > 0) {
        for (const entity of entities) target.add(entity);
      } else {
        target.add(inferAccessLabel(content));
      }
    }
  }
};

const detectDataAccess = (
  sourceFiles: readonly { readonly content: string }[],
): { read: string[]; write: string[]; delete: string[] } => {
  const read = new Set<string>();
  const write = new Set<string>();
  const del = new Set<string>();

  for (const file of sourceFiles) {
    const entities = collectEntities(file.content);
    addMatchedAccess(file.content, DATA_ACCESS_PATTERNS.read, entities, read);
    addMatchedAccess(file.content, DATA_ACCESS_PATTERNS.write, entities, write);
    addMatchedAccess(file.content, DATA_ACCESS_PATTERNS.delete, entities, del);
  }

  return {
    read: [...read],
    write: [...write],
    delete: [...del],
  };
};

// --- MCP config detection ---

interface McpServer {
  readonly name: string;
  readonly tools_allowed: readonly string[];
}

const MCP_SERVER_PATTERN = /["'](\w[\w-]*)["']\s*:\s*\{[^}]*(?:command|url)/g;

const detectMcpServers = (
  allFiles: readonly { readonly relativePath: string; readonly content: string }[],
): readonly McpServer[] => {
  const servers: McpServer[] = [];

  // Look for mcp.json or files containing mcpServers
  const mcpFiles = allFiles.filter(
    (f) =>
      f.relativePath.endsWith('mcp.json') ||
      f.relativePath.includes('mcp') ||
      f.content.includes('mcpServers'),
  );

  for (const file of mcpFiles) {
    // Try parsing as JSON (mcp.json)
    if (file.relativePath.endsWith('.json')) {
      try {
        const raw: unknown = JSON.parse(file.content);
        if (typeof raw === 'object' && raw !== null && 'mcpServers' in raw) {
          const mcpServers = (raw as Record<string, unknown>).mcpServers;
          if (typeof mcpServers === 'object' && mcpServers !== null) {
            for (const [name, config] of Object.entries(
              mcpServers as Record<string, unknown>,
            )) {
              const toolsAllowed: string[] = [];
              if (
                typeof config === 'object' &&
                config !== null &&
                'tools_allowed' in config
              ) {
                const tools = (config as Record<string, unknown>).tools_allowed;
                if (Array.isArray(tools)) {
                  for (const t of tools) {
                    if (typeof t === 'string') toolsAllowed.push(t);
                  }
                }
              }
              servers.push({ name, tools_allowed: toolsAllowed });
            }
          }
        }
      } catch {
        // Not valid JSON, try regex fallback
      }
    }

    // Regex fallback for non-JSON or unparseable files
    if (servers.length === 0) {
      MCP_SERVER_PATTERN.lastIndex = 0;
      let serverMatch: RegExpExecArray | null;
      while ((serverMatch = MCP_SERVER_PATTERN.exec(file.content)) !== null) {
        servers.push({ name: serverMatch[1], tools_allowed: [] });
      }
    }
  }

  return servers;
};

// --- Human approval detection ---

const HUMAN_APPROVAL_PATTERNS: readonly RegExp[] = [
  /confirm\(/g,
  /approve\(/g,
  /human_review/g,
  /requires_approval/g,
  /human_in_the_loop/g,
];

const APPROVAL_CONTEXT_PATTERN =
  /(?:confirm|approve|human_review|requires_approval|human_in_the_loop)\s*\(\s*['"]([^'"]+)['"]/g;

const detectHumanApproval = (
  sourceFiles: readonly { readonly content: string }[],
): string[] => {
  const approvals = new Set<string>();

  for (const file of sourceFiles) {
    // First check if any approval patterns exist
    let hasApproval = false;
    for (const pattern of HUMAN_APPROVAL_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        hasApproval = true;
        break;
      }
    }

    if (!hasApproval) continue;

    // Extract context/action names
    APPROVAL_CONTEXT_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = APPROVAL_CONTEXT_PATTERN.exec(file.content)) !== null) {
      approvals.add(match[1]);
    }

    // If patterns found but no context extracted, add generic marker
    if (approvals.size === 0) {
      approvals.add('human_approval');
    }
  }

  return [...approvals];
};

// --- Line number helper ---

const getLineNumber = (content: string, charIndex: number): number => {
  let line = 1;
  for (let i = 0; i < charIndex && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
};

// --- Framework-specific tool patterns ---

interface FrameworkPattern {
  readonly framework: ToolFramework;
  readonly pattern: RegExp;
}

const FRAMEWORK_TOOL_PATTERNS: readonly FrameworkPattern[] = [
  // LangChain
  { framework: 'langchain', pattern: /class\s+(\w+)\s+extends\s+(?:StructuredTool|BaseTool|DynamicTool)/g },
  { framework: 'langchain', pattern: /new\s+DynamicTool\(\s*\{[^}]*name:\s*['"](\w+)['"]/g },
  { framework: 'langchain', pattern: /new\s+(?:StructuredTool|Tool)\(\s*\{[^}]*name:\s*['"](\w+)['"]/g },
  // CrewAI
  { framework: 'crewai', pattern: /Tool\(\s*name\s*=\s*['"](\w+)['"]/g },
  { framework: 'crewai', pattern: /class\s+(\w+)\(BaseTool\)/g },
  // OpenAI
  { framework: 'openai', pattern: /function:\s*\{\s*name:\s*['"](\w+)['"]/g },
  { framework: 'openai', pattern: /type:\s*['"]function['"][^}]*name:\s*['"](\w+)['"]/g },
  // Anthropic
  { framework: 'anthropic', pattern: /\{\s*name:\s*['"](\w+)['"][^}]*input_schema:/g },
  // MCP
  { framework: 'mcp', pattern: /server\.tool\(\s*['"](\w+)['"]/g },
  { framework: 'mcp', pattern: /registerTool\(\s*['"](\w+)['"]/g },
  { framework: 'mcp', pattern: /\.addTool\(\s*['"](\w+)['"]/g },
  // Vercel AI
  { framework: 'vercel-ai', pattern: /(?<!\.)tool\(\s*['"](\w+)['"]/g },
  // Generic (Python @tool decorator)
  { framework: 'generic', pattern: /@tool[^)]*\)\s*\n\s*(?:def|async\s+def)\s+(\w+)/g },
];

// --- Helpers ---

const getSourceFiles = (ctx: ScanContext) =>
  ctx.files.filter((f) => isSourceFile(f.relativePath, f.extension));

// --- Main scan function ---

export const scanPermissions = (ctx: ScanContext): DiscoveredPermissions => {
  const sourceFiles = getSourceFiles(ctx);

  return {
    tools: detectTools(sourceFiles),
    dataAccess: detectDataAccess(sourceFiles),
    denied: [],
    mcpServers: detectMcpServers(ctx.files),
    humanApprovalRequired: detectHumanApproval(sourceFiles),
  };
};

// --- Detailed scan with framework-specific patterns ---

export const scanPermissionsDetailed = (ctx: ScanContext): DiscoveredPermissionsDetailed => {
  const base = scanPermissions(ctx);
  const sourceFiles = getSourceFiles(ctx);

  const toolsDetailed: DiscoveredTool[] = [];
  const toolNames = new Set<string>();

  for (const file of sourceFiles) {
    for (const { framework, pattern } of FRAMEWORK_TOOL_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(file.content)) !== null) {
        toolsDetailed.push({
          name: match[1],
          framework,
          file: file.relativePath,
          line: getLineNumber(file.content, match.index),
        });
        toolNames.add(match[1]);
      }
    }
  }

  return {
    ...base,
    tools: [...toolNames],
    toolsDetailed,
  };
};
