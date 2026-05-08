import { z } from 'zod';

/**
 * MCP tool schemas — single source of truth for tool name, description, and Zod input schema.
 *
 * v1.0.0 (S05): 7 tools — scan, fix, status, explain, search_tool, classify, report
 * V2-M02 (Phase 2.1): +3 builder tools — passport_init, doc_generate, redteam
 * V2-M02 (Phase 2.2): +3 analytics tools — evidence_verify, drift_detect, obligations_status
 *
 * Total: 13 tools.
 *
 * Architecture rules:
 * - All schemas Zod-typed (no `any`)
 * - All params have `.describe()` for AI-agent UX (Claude / Cursor / Codex see these descriptions)
 * - Schemas are `as const` to preserve literal types
 * - Adding new tools is additive only — never modify existing schemas (breaking change for v1.0 users)
 */
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

  // ── V2-M02 Phase 2.1 — Builder tools ────────────────────────────

  complior_passport_init: {
    description:
      'Generate Agent Passport(s) (Mode 1 Auto) by AST-scanning the project. Returns the passport JSON, ' +
      'completeness percentage, and saved paths. Each passport is ed25519-signed and includes 36 fields ' +
      'covering identity, capabilities, autonomy, permissions, oversight, and lifecycle.',
    inputSchema: {
      path: z.string().optional().describe('Project path to scan for AI agents (default: current directory)'),
      agentName: z
        .string()
        .optional()
        .describe('Optional: filter to a single agent name (skip if multiple agents discovered)'),
      force: z
        .boolean()
        .optional()
        .describe('Overwrite existing passports while preserving created/deployed_since timestamps'),
    },
  },
  complior_doc_generate: {
    description:
      'Generate an EU AI Act compliance document from a passport. Supports 14 document types covering ' +
      'Art. 4–73 (FRIA, Risk Management System, Data Governance, Technical Documentation, etc.). ' +
      'Returns the markdown content, prefilled fields, manual fields, and saved file path.',
    inputSchema: {
      docType: z
        .enum([
          'ai-literacy',
          'art5-screening',
          'technical-documentation',
          'incident-report',
          'declaration-of-conformity',
          'monitoring-policy',
          'fria',
          'worker-notification',
          'risk-management',
          'data-governance',
          'qms',
          'instructions-for-use',
          'gpai-transparency',
          'gpai-systemic-risk',
        ])
        .describe('Document type to generate (one of 14 EU AI Act templates)'),
      passportName: z.string().describe('Agent passport name (run complior_passport_init first if missing)'),
      organization: z
        .string()
        .optional()
        .describe('Organization name to use in the document (default: passport organization field)'),
      path: z.string().optional().describe('Project path (default: current directory)'),
    },
  },
  complior_redteam: {
    description:
      'Run 300+ adversarial security probes (OWASP LLM Top 10, MITRE ATLAS) against an AI endpoint. ' +
      'Returns aggregate score, per-category breakdown, and individual probe results. Long-running ' +
      'operation (typically 30s–5min depending on concurrency and target latency).',
    inputSchema: {
      target: z.string().url().describe('Target AI endpoint URL (e.g., https://api.example.com/v1/chat)'),
      apiKey: z.string().optional().describe('Optional API key for authenticated targets (forwarded as Authorization header)'),
      concurrency: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Parallel probe execution (default: 1, max: 50)'),
      threshold: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Score threshold for pass/fail gate (default: no gate)'),
    },
  },

  // ── V2-M02 Phase 2.2 — Analytics tools ──────────────────────────

  complior_evidence_verify: {
    description:
      'Verify integrity of the evidence chain (SHA-256 + ed25519). Returns valid flag, total entries, ' +
      'scan count, broken-at index (if tampered), and human-readable issues. Used for audit ' +
      'preparation — every scan and fix appends to the chain, so the chain is the cryptographic proof ' +
      'of compliance history.',
    inputSchema: {
      path: z.string().optional().describe('Project path containing .complior/evidence/ (default: current directory)'),
    },
  },
  complior_drift_detect: {
    description:
      'Compare the latest scan against the previous one and report compliance drift. Returns ' +
      'severity (none/minor/major/critical), score change, new failures, resolved failures, and ' +
      'affected EU AI Act articles. Critical = new Art. 5 prohibited practice or score drop >10pts.',
    inputSchema: {
      path: z.string().optional().describe('Project path with scan history (default: current directory)'),
    },
  },
  complior_obligations_status: {
    description:
      'Per-obligation coverage breakdown across all 108 EU AI Act obligations. Filterable by article, ' +
      'role, risk level, and coverage status. Returns covered count, uncovered count, deadline summary, ' +
      'and per-obligation pass/fail/skip mapping based on the latest scan result.',
    inputSchema: {
      role: z
        .enum(['provider', 'deployer', 'both'])
        .optional()
        .describe('Filter by applicable role (default: all)'),
      riskLevel: z
        .enum(['unacceptable', 'high', 'limited', 'minimal'])
        .optional()
        .describe('Filter by EU AI Act risk classification (default: all)'),
      coverage: z
        .enum(['covered', 'uncovered', 'all'])
        .optional()
        .describe('Filter by current scan coverage status (default: all)'),
    },
  },
} as const;

export type McpToolName = keyof typeof MCP_TOOL_SCHEMAS;
