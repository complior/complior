import { z } from 'zod';
import type { ToolDefinition } from './types.js';

const ScanParams = z.object({
  path: z.string().optional().describe('Project path (default: current directory)'),
  deep: z.boolean().optional().describe('Include L5 deep analysis'),
});

const FixParams = z.object({
  obligationId: z.string().describe('Obligation ID to fix (e.g., "eu-ai-act-OBL-015")'),
  autoApply: z.boolean().optional().describe('Apply fix without preview (default: false)'),
});

const ClassifyParams = z.object({
  description: z.string().describe('Description of the AI system'),
  domain: z.string().optional().describe('Business domain (hr, healthcare, finance, education)'),
});

const ScenarioParams = z.object({
  scenario: z.string().describe('Scenario description'),
  type: z.enum(['jurisdiction', 'tool', 'risk_level']).describe('Scenario type'),
});

const ReportParams = z.object({
  format: z.enum(['json', 'markdown']).optional().describe('Output format'),
  sections: z.array(z.string()).optional().describe('Report sections to include'),
});

const ExplainParams = z.object({
  article: z.string().describe('Article reference (e.g., "Art. 50", "OBL-015")'),
});

const SearchToolParams = z.object({
  query: z.string().describe('Tool name or keyword'),
  category: z.string().optional().describe('Filter by category'),
});

const JurisdictionParams = z.object({
  jurisdictions: z.array(z.string()).min(2).describe('Jurisdictions to compare'),
});

const ScanUrlParams = z.object({
  url: z.string().url().describe('URL to scan'),
});

const AskUserParams = z.object({
  question: z.string().describe('Question to ask'),
  options: z.array(z.string()).optional().describe('Answer options'),
});

export const createComplianceTools = (deps: {
  readonly scan: (path: string) => Promise<unknown>;
  readonly fix: (checkId: string, oblId?: string) => Promise<unknown>;
  readonly getStatus: () => unknown;
  readonly explain: (article: string) => Promise<unknown>;
  readonly searchTool: (query: string) => Promise<unknown>;
  readonly classify: (desc: string, domain?: string) => Promise<unknown>;
  readonly report: (format?: string) => Promise<unknown>;
  readonly getDeadlines: () => unknown;
  readonly getMemory: () => unknown;
}): readonly ToolDefinition[] => [
  {
    name: 'scanProject',
    description: 'Scan the project for EU AI Act compliance. Returns score, zone, violations, and top findings. All compliance determinations are made by deterministic code, not AI.',
    category: 'compliance',
    parameters: ScanParams,
    execute: async (raw) => {
      const args = ScanParams.parse(raw);
      return JSON.stringify(await deps.scan(args.path ?? '.'));
    },
  },
  {
    name: 'fixIssue',
    description: 'Auto-fix a specific compliance violation. Generates diff, applies changes, and re-scans. Returns score delta.',
    category: 'compliance',
    parameters: FixParams,
    execute: async (raw) => {
      const args = FixParams.parse(raw);
      return JSON.stringify(await deps.fix(args.obligationId, args.obligationId));
    },
  },
  {
    name: 'classifyRisk',
    description: 'Classify the risk level of an AI system based on description and domain. Returns risk level and applicable obligations.',
    category: 'compliance',
    parameters: ClassifyParams,
    execute: async (raw) => {
      const args = ClassifyParams.parse(raw);
      return JSON.stringify(await deps.classify(args.description, args.domain));
    },
  },
  {
    name: 'whatIfScenario',
    description: 'Model a "what if" scenario: jurisdiction change, new tool, or risk level change. Returns projected impact.',
    category: 'compliance',
    parameters: ScenarioParams,
    execute: async (raw) => {
      const args = ScenarioParams.parse(raw);
      return JSON.stringify({ scenario: args.scenario, type: args.type, message: 'What-if modeling available in future release' });
    },
  },
  {
    name: 'generateReport',
    description: 'Generate a compliance report. Available formats: json, markdown.',
    category: 'compliance',
    parameters: ReportParams,
    execute: async (raw) => {
      const args = ReportParams.parse(raw);
      return JSON.stringify(await deps.report(args.format));
    },
  },
  {
    name: 'explainRegulation',
    description: 'Explain an EU AI Act article or obligation in plain language with code implications.',
    category: 'compliance',
    parameters: ExplainParams,
    execute: async (raw) => {
      const args = ExplainParams.parse(raw);
      return JSON.stringify(await deps.explain(args.article));
    },
  },
  {
    name: 'searchToolDirectory',
    description: 'Search the AI tool catalog for compliance information about a specific tool or SDK.',
    category: 'compliance',
    parameters: SearchToolParams,
    execute: async (raw) => {
      const args = SearchToolParams.parse(raw);
      return JSON.stringify(await deps.searchTool(args.query));
    },
  },
  {
    name: 'compareJurisdictions',
    description: 'Compare compliance requirements across jurisdictions (EU, US states, UK, etc.).',
    category: 'compliance',
    parameters: JurisdictionParams,
    execute: async (raw) => {
      const args = JurisdictionParams.parse(raw);
      return JSON.stringify({ jurisdictions: args.jurisdictions, message: 'Multi-jurisdiction comparison available in future release' });
    },
  },
  {
    name: 'getComplianceStatus',
    description: 'Get current compliance score and category breakdown from the last scan.',
    category: 'compliance',
    parameters: z.object({}),
    execute: async () => JSON.stringify(deps.getStatus()),
  },
  {
    name: 'getDeadlines',
    description: 'Get compliance deadlines by role and risk level.',
    category: 'compliance',
    parameters: z.object({
      role: z.string().optional().describe('Role: provider or deployer'),
      riskLevel: z.string().optional().describe('Risk level filter'),
    }),
    execute: async () => JSON.stringify(deps.getDeadlines()),
  },
  {
    name: 'estimatePenalty',
    description: 'Estimate potential penalty for current violations based on EU AI Act penalty tiers.',
    category: 'compliance',
    parameters: z.object({
      obligationIds: z.array(z.string()).optional().describe('Specific obligations to assess'),
    }),
    execute: async () => JSON.stringify({ message: 'Penalty estimation available in future release' }),
  },
  {
    name: 'getProjectMemory',
    description: 'Get project context: profile, scan history, fix history.',
    category: 'compliance',
    parameters: z.object({}),
    execute: async () => JSON.stringify(deps.getMemory()),
  },
  {
    name: 'scanExternalURL',
    description: 'Scan a public AI product website for compliance indicators.',
    category: 'compliance',
    parameters: ScanUrlParams,
    execute: async (raw) => {
      const args = ScanUrlParams.parse(raw);
      return JSON.stringify({ url: args.url, message: 'External scanning available in future release' });
    },
  },
  {
    name: 'getPeerComparison',
    description: 'Compare your compliance score with similar projects.',
    category: 'compliance',
    parameters: z.object({
      domain: z.string().optional().describe('Business domain'),
      framework: z.string().optional().describe('Framework filter'),
    }),
    execute: async () => JSON.stringify({ message: 'Peer comparison available in future release' }),
  },
  {
    name: 'askUser',
    description: 'Ask the user a clarifying question during compliance analysis.',
    category: 'compliance',
    parameters: AskUserParams,
    execute: async (raw) => {
      const args = AskUserParams.parse(raw);
      return JSON.stringify({ question: args.question, options: args.options, awaiting: true });
    },
  },
];
