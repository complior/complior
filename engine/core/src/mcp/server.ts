import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { McpHandlers } from './handlers.js';
import { MCP_TOOL_SCHEMAS } from './tools.js';
import { createLogger } from '../infra/logger.js';

export interface McpServerDeps {
  readonly handlers: McpHandlers;
  readonly version: string;
}

export const createMcpServer = (deps: McpServerDeps) => {
  const { handlers, version } = deps;

  const server = new McpServer(
    { name: 'complior', version },
    { capabilities: { tools: {} } },
  );

  // Register all 7 tools
  server.tool(
    'complior_scan',
    MCP_TOOL_SCHEMAS.complior_scan.description,
    MCP_TOOL_SCHEMAS.complior_scan.inputSchema,
    async (args) => handlers.complior_scan(args),
  );

  server.tool(
    'complior_fix',
    MCP_TOOL_SCHEMAS.complior_fix.description,
    MCP_TOOL_SCHEMAS.complior_fix.inputSchema,
    async (args) => handlers.complior_fix(args),
  );

  server.tool(
    'complior_status',
    MCP_TOOL_SCHEMAS.complior_status.description,
    {},
    async () => handlers.complior_status(),
  );

  server.tool(
    'complior_explain',
    MCP_TOOL_SCHEMAS.complior_explain.description,
    MCP_TOOL_SCHEMAS.complior_explain.inputSchema,
    async (args) => handlers.complior_explain(args),
  );

  server.tool(
    'complior_search_tool',
    MCP_TOOL_SCHEMAS.complior_search_tool.description,
    MCP_TOOL_SCHEMAS.complior_search_tool.inputSchema,
    async (args) => handlers.complior_search_tool(args),
  );

  server.tool(
    'complior_classify',
    MCP_TOOL_SCHEMAS.complior_classify.description,
    MCP_TOOL_SCHEMAS.complior_classify.inputSchema,
    async (args) => handlers.complior_classify(args),
  );

  server.tool(
    'complior_report',
    MCP_TOOL_SCHEMAS.complior_report.description,
    { format: z.enum(['json', 'markdown']).optional() },
    async (args) => handlers.complior_report(args),
  );

  // ── V2-M02 Phase 2.1 — Builder tools ───────────────────────────────

  server.tool(
    'complior_passport_init',
    MCP_TOOL_SCHEMAS.complior_passport_init.description,
    MCP_TOOL_SCHEMAS.complior_passport_init.inputSchema,
    async (args) => handlers.complior_passport_init(args),
  );

  server.tool(
    'complior_doc_generate',
    MCP_TOOL_SCHEMAS.complior_doc_generate.description,
    MCP_TOOL_SCHEMAS.complior_doc_generate.inputSchema,
    async (args) => handlers.complior_doc_generate(args),
  );

  server.tool(
    'complior_redteam',
    MCP_TOOL_SCHEMAS.complior_redteam.description,
    MCP_TOOL_SCHEMAS.complior_redteam.inputSchema,
    async (args) => handlers.complior_redteam(args),
  );

  // ── V2-M02 Phase 2.2 — Analytics tools ─────────────────────────────

  server.tool(
    'complior_evidence_verify',
    MCP_TOOL_SCHEMAS.complior_evidence_verify.description,
    MCP_TOOL_SCHEMAS.complior_evidence_verify.inputSchema,
    async (args) => handlers.complior_evidence_verify(args),
  );

  server.tool(
    'complior_drift_detect',
    MCP_TOOL_SCHEMAS.complior_drift_detect.description,
    MCP_TOOL_SCHEMAS.complior_drift_detect.inputSchema,
    async (args) => handlers.complior_drift_detect(args),
  );

  server.tool(
    'complior_obligations_status',
    MCP_TOOL_SCHEMAS.complior_obligations_status.description,
    MCP_TOOL_SCHEMAS.complior_obligations_status.inputSchema,
    async (args) => handlers.complior_obligations_status(args),
  );

  const start = async (): Promise<void> => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    const log = createLogger('mcp');
    log.info(`Complior MCP Server v${version} started on stdio`);
  };

  return Object.freeze({ start, server });
};
