import type { CoreMessage } from 'ai';
import type { ScanResult } from '../types/common.types.js';
import type { RegulationData } from '../data/regulation-loader.js';

export interface ChatServiceDeps {
  readonly getConversationHistory: () => CoreMessage[];
  readonly appendConversationHistory: (message: CoreMessage) => void;
  readonly getProjectPath: () => string;
  readonly getVersion: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly getRegulationData: () => RegulationData;
}

export const createChatService = (deps: ChatServiceDeps) => {
  const {
    getConversationHistory,
    appendConversationHistory,
    getProjectPath,
    getVersion,
    getLastScanResult,
    getRegulationData,
  } = deps;

  const buildSystemPrompt = (): string => {
    const parts: string[] = [];

    parts.push('You are Complior — an EU AI Act compliance assistant and AI coding agent.');
    parts.push('You help developers ensure their AI systems comply with the EU AI Act regulation.');
    parts.push('');
    parts.push('## Capabilities');
    parts.push('You have access to tools for scanning projects, reading/writing files, searching code, running commands, and git operations.');
    parts.push('When asked to analyze or fix compliance issues, use the available tools to inspect the codebase and make changes.');
    parts.push('');
    parts.push('## Guidelines');
    parts.push('- Always think step-by-step before acting');
    parts.push('- Read files before editing them');
    parts.push('- After making changes that affect compliance, run a scan to verify the impact');
    parts.push('- Be precise and concise in explanations');
    parts.push('- Reference specific EU AI Act articles when relevant');
    parts.push('');
    parts.push(`## Current Context`);
    parts.push(`- Project path: ${getProjectPath()}`);
    parts.push(`- Engine version: ${getVersion()}`);

    const lastScan = getLastScanResult();
    if (lastScan) {
      const { totalScore, zone } = lastScan.score;
      parts.push(`- Last scan score: ${totalScore}/100 (${zone} zone)`);
      parts.push(`- Files scanned: ${lastScan.filesScanned}`);
      const criticalCount = lastScan.findings.filter(f => f.severity === 'critical').length;
      if (criticalCount > 0) {
        parts.push(`- Critical findings: ${criticalCount}`);
      }
    }

    const regulationData = getRegulationData();
    const obligations = regulationData.obligations.obligations;
    if (obligations.length > 0) {
      parts.push('');
      parts.push('## Key EU AI Act Obligations');
      for (const ob of obligations.slice(0, 10)) {
        const riskLevels = ob.applies_to_risk_level.join(', ');
        parts.push(`- ${ob.obligation_id}: ${ob.title} (${riskLevels})`);
      }
    }

    return parts.join('\n');
  };

  return Object.freeze({
    buildSystemPrompt,
    getConversationHistory,
    appendConversationHistory,
    getProjectPath,
  });
};

export type ChatService = ReturnType<typeof createChatService>;
