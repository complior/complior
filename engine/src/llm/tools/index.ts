import type { ToolDefinition, AgentMode } from './types.js';

// Mode → allowed tool names
const MODE_TOOLS: Record<AgentMode, readonly string[] | 'all'> = {
  build: 'all',
  comply: [
    'scanProject', 'fixIssue', 'classifyRisk', 'whatIfScenario', 'generateReport',
    'explainRegulation', 'searchToolDirectory', 'compareJurisdictions', 'getComplianceStatus',
    'getDeadlines', 'estimatePenalty', 'getProjectMemory', 'getPeerComparison', 'askUser',
    'scanExternalURL',
    'readFile', 'searchCode',
  ],
  audit: [
    'scanProject', 'generateReport', 'explainRegulation', 'searchToolDirectory',
    'getComplianceStatus', 'getDeadlines',
  ],
  learn: [
    'explainRegulation', 'searchToolDirectory', 'compareJurisdictions', 'askUser',
  ],
};

export const createToolRegistry = (
  complianceTools: readonly ToolDefinition[],
  codingTools: readonly ToolDefinition[],
) => {
  const allTools = [...complianceTools, ...codingTools];

  const getAllTools = (): readonly ToolDefinition[] => allTools;

  const getToolsByMode = (mode: AgentMode): readonly ToolDefinition[] => {
    const allowed = MODE_TOOLS[mode];
    if (allowed === 'all') return allTools;
    return allTools.filter((t) => allowed.includes(t.name));
  };

  const getTool = (name: string): ToolDefinition | undefined =>
    allTools.find((t) => t.name === name);

  return Object.freeze({ getAllTools, getToolsByMode, getTool });
};

export type ToolRegistry = ReturnType<typeof createToolRegistry>;
