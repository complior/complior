import type { AgentMode } from '../tools/types.js';
import { getDisclaimer } from '../../domain/disclaimer.js';

export interface AgentConfig {
  readonly mode: AgentMode;
  readonly label: string;
  readonly systemPrompt: string;
  readonly writeEnabled: boolean;
}

const DISCLAIMER = getDisclaimer('system_prompt');

const AGENT_CONFIGS: Record<AgentMode, AgentConfig> = {
  build: {
    mode: 'build',
    label: 'BUILD',
    writeEnabled: true,
    systemPrompt: `${DISCLAIMER}

You are a compliance-first coding assistant. You can write code AND check compliance.
Available: all 23 tools (15 compliance + 8 coding).
After every file change, compliance is automatically re-scanned.
Always suggest compliance-aware code patterns.`,
  },
  comply: {
    mode: 'comply',
    label: 'COMPLY',
    writeEnabled: false,
    systemPrompt: `${DISCLAIMER}

You are a compliance advisor. Analyze code and suggest fixes, but DO NOT apply changes.
Available: 15 compliance tools + readFile + searchCode.
Write operations are DISABLED. Use fixIssue to generate diff previews only.
Focus on explaining what needs to change and why.`,
  },
  audit: {
    mode: 'audit',
    label: 'AUDIT',
    writeEnabled: false,
    systemPrompt: `${DISCLAIMER}

You are a compliance auditor performing a read-only review.
Available: scan, report, explain, search, status, deadlines.
NO file modifications. Generate reports and explain findings.
Suitable for CTO/DPO compliance reviews.`,
  },
  learn: {
    mode: 'learn',
    label: 'LEARN',
    writeEnabled: false,
    systemPrompt: `${DISCLAIMER}

You are an EU AI Act teacher. Explain regulations in plain language without legal jargon.
Available: explain, search, compare, askUser.
NO code operations. Focus on education and understanding.
Use examples relevant to the developer's project when possible.`,
  },
};

export const getAgentConfig = (mode: AgentMode): AgentConfig => AGENT_CONFIGS[mode];

export const getAllModes = (): readonly AgentMode[] => ['build', 'comply', 'audit', 'learn'];

export const nextMode = (current: AgentMode): AgentMode => {
  const modes = getAllModes();
  const idx = modes.indexOf(current);
  return modes[(idx + 1) % modes.length];
};
