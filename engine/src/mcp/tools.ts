import { z } from 'zod';

export const MCP_TOOL_SCHEMAS = {
  complior_scan: {
    description: 'Scan a project for EU AI Act compliance. Returns score, violations, and top findings.',
    inputSchema: {
      path: z.string().optional().describe('Project path to scan (default: current directory)'),
    },
  },
  complior_fix: {
    description: 'Auto-fix a specific compliance violation. Returns diff preview and score delta.',
    inputSchema: {
      checkId: z.string().describe('Check ID of the finding to fix (e.g., "ai-disclosure")'),
      obligationId: z.string().optional().describe('Obligation ID (e.g., "eu-ai-act-OBL-015")'),
    },
  },
  complior_status: {
    description: 'Get current compliance score and category breakdown from the last scan.',
    inputSchema: {},
  },
  complior_explain: {
    description: 'Explain an EU AI Act article or obligation in plain language with code implications.',
    inputSchema: {
      article: z.string().describe('Article reference (e.g., "Art. 50" or "OBL-015")'),
    },
  },
  complior_search_tool: {
    description: 'Search the AI tool catalog for compliance information about a specific tool.',
    inputSchema: {
      query: z.string().describe('Tool name or keyword (e.g., "openai", "langchain")'),
    },
  },
  complior_classify: {
    description: 'Classify the risk level of an AI system based on its description and domain.',
    inputSchema: {
      description: z.string().describe('Description of the AI system'),
      domain: z.string().optional().describe('Business domain (e.g., "healthcare", "finance", "hr")'),
    },
  },
  complior_report: {
    description: 'Generate a compliance report in JSON or Markdown format.',
    inputSchema: {
      format: z.enum(['json', 'markdown']).optional().describe('Output format (default: markdown)'),
    },
  },
} as const;

export type McpToolName = keyof typeof MCP_TOOL_SCHEMAS;
