import type { ScanContext } from '../../ports/scanner.port.js';

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

const IGNORED_DIRS: ReadonlySet<string> = new Set([
  'node_modules', 'dist', '.git',
]);

const isSourceFile = (relativePath: string, extension: string): boolean => {
  if (!SOURCE_EXTENSIONS.has(extension)) return false;
  const parts = relativePath.split('/');
  return !parts.some((part) => IGNORED_DIRS.has(part));
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

// --- Database access detection ---

interface DataAccessPatterns {
  readonly read: readonly RegExp[];
  readonly write: readonly RegExp[];
  readonly delete: readonly RegExp[];
}

const DB_PATTERNS: DataAccessPatterns = {
  read: [
    /\.find\(/g,
    /\.findOne\(/g,
    /\.findMany\(/g,
    /SELECT\s/g,
    /\.get\(/g,
    /\.query\(/g,
  ],
  write: [
    /\.create\(/g,
    /\.update\(/g,
    /\.upsert\(/g,
    /INSERT\s/g,
    /UPDATE\s/g,
    /\.put\(/g,
    /\.set\(/g,
  ],
  delete: [
    /\.delete\(/g,
    /\.remove\(/g,
    /DELETE\s/g,
    /\.destroy\(/g,
  ],
};

const ENTITY_PATTERN = /(?:prisma|db|model|collection)\.(\w+)\./g;

const detectDataAccess = (
  sourceFiles: readonly { readonly content: string }[],
): { read: string[]; write: string[]; delete: string[] } => {
  const read = new Set<string>();
  const write = new Set<string>();
  const del = new Set<string>();

  for (const file of sourceFiles) {
    // Extract entity/table names
    const entities = new Set<string>();
    ENTITY_PATTERN.lastIndex = 0;
    let entityMatch: RegExpExecArray | null;
    while ((entityMatch = ENTITY_PATTERN.exec(file.content)) !== null) {
      entities.add(entityMatch[1]);
    }

    // Check read patterns
    for (const pattern of DB_PATTERNS.read) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        if (entities.size > 0) {
          for (const entity of entities) read.add(entity);
        } else {
          read.add('database');
        }
      }
    }

    // Check write patterns
    for (const pattern of DB_PATTERNS.write) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        if (entities.size > 0) {
          for (const entity of entities) write.add(entity);
        } else {
          write.add('database');
        }
      }
    }

    // Check delete patterns
    for (const pattern of DB_PATTERNS.delete) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        if (entities.size > 0) {
          for (const entity of entities) del.add(entity);
        } else {
          del.add('database');
        }
      }
    }
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
  // Generic (Python @tool decorator)
  { framework: 'generic', pattern: /@tool[^)]*\)\s*\n\s*(?:def|async\s+def)\s+(\w+)/g },
];

// --- Main scan function ---

export const scanPermissions = (ctx: ScanContext): DiscoveredPermissions => {
  // Get source files
  const sourceFiles = ctx.files.filter((f) =>
    isSourceFile(f.relativePath, f.extension),
  );

  // 1. Detect tools
  const tools = detectTools(sourceFiles);

  // 2. Detect data access
  const dataAccess = detectDataAccess(sourceFiles);

  // 3. Detect MCP servers (scan all files, not just source)
  const mcpServers = detectMcpServers(ctx.files);

  // 4. Detect human approval requirements
  const humanApprovalRequired = detectHumanApproval(sourceFiles);

  // 5. Denied is empty by default (can't auto-detect denied actions)
  const denied: readonly string[] = [];

  return {
    tools,
    dataAccess,
    denied,
    mcpServers,
    humanApprovalRequired,
  };
};

// --- Detailed scan with framework-specific patterns ---

export const scanPermissionsDetailed = (ctx: ScanContext): DiscoveredPermissionsDetailed => {
  const base = scanPermissions(ctx);

  const sourceFiles = ctx.files.filter((f) =>
    isSourceFile(f.relativePath, f.extension),
  );

  // Detect tools with framework-specific patterns
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
