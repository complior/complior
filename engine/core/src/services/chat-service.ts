import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import type { CoreMessage } from 'ai';
import type { ScanResult } from '../types/common.types.js';
import type { PassportSummary } from '../types/passport.types.js';
import type { RegulationData } from '../data/regulation-loader.js';
import { EU_AI_ACT_DEADLINE } from '../domain/shared/compliance-constants.js';

/** Maximum chat messages retained in history (disk + memory). */
const MAX_HISTORY = 100;

/** Maximum top findings shown in system prompt. */
const MAX_TOP_FINDINGS = 5;

/** Zod schema for validating CoreMessage from disk. */
const CoreMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.unknown(),
});
const ChatHistorySchema = z.array(CoreMessageSchema);

export interface ChatServiceDeps {
  readonly getConversationHistory: () => CoreMessage[];
  readonly appendConversationHistory: (message: CoreMessage) => void;
  readonly getProjectPath: () => string;
  readonly getVersion: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly getRegulationData: () => RegulationData;
  readonly getPassportSummary: () => Promise<PassportSummary | null>;
  readonly getChatHistoryPath: () => string;
}

export const createChatService = (deps: ChatServiceDeps) => {
  const {
    getConversationHistory,
    appendConversationHistory,
    getProjectPath,
    getVersion,
    getLastScanResult,
    getRegulationData,
    getPassportSummary,
    getChatHistoryPath,
  } = deps;

  const buildSystemPrompt = async (): Promise<string> => {
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

    // Deadline
    const daysLeft = Math.max(0, Math.ceil((EU_AI_ACT_DEADLINE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    parts.push(`- EU AI Act full enforcement deadline: 2 August 2026 (${daysLeft}d left)`);

    const lastScan = getLastScanResult();
    if (lastScan) {
      const { totalScore, zone } = lastScan.score;
      parts.push(`- Last scan score: ${totalScore}/100 (${zone} zone)`);
      parts.push(`- Files scanned: ${lastScan.filesScanned}`);

      // Top critical/high findings
      const topFindings = lastScan.findings
        .filter(f => f.severity === 'critical' || f.severity === 'high')
        .slice(0, MAX_TOP_FINDINGS);
      if (topFindings.length > 0) {
        parts.push('');
        parts.push('## Top Findings');
        for (const f of topFindings) {
          parts.push(`- [${f.severity.toUpperCase()}] ${f.checkId}: ${f.message}`);
        }
      }
    }

    // Passport summary
    try {
      const passport = await getPassportSummary();
      if (passport) {
        parts.push('');
        parts.push('## Agent Passport');
        parts.push(`- Name: ${passport.name}`);
        parts.push(`- Type: ${passport.type}`);
        parts.push(`- Risk class: ${passport.riskClass}`);
        parts.push(`- Autonomy level: ${passport.autonomyLevel}`);
        parts.push(`- Completeness: ${passport.completeness}%`);
      }
    } catch { /* passport unavailable — skip */ }

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

  const loadHistory = async (): Promise<void> => {
    try {
      const raw = await readFile(getChatHistoryPath(), 'utf-8');
      const parsed = ChatHistorySchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return;
      const recent = parsed.data.slice(-MAX_HISTORY);
      for (const msg of recent) {
        appendConversationHistory(msg as CoreMessage);
      }
    } catch { /* no history file — expected on first run */ }
  };

  const saveHistory = async (): Promise<void> => {
    const historyPath = getChatHistoryPath();
    const history = getConversationHistory().slice(-MAX_HISTORY);
    try {
      await mkdir(dirname(historyPath), { recursive: true });
      await writeFile(historyPath, JSON.stringify(history), 'utf-8');
    } catch { /* ignore write errors */ }
  };

  return Object.freeze({
    buildSystemPrompt,
    getConversationHistory,
    appendConversationHistory,
    getProjectPath,
    loadHistory,
    saveHistory,
  });
};

export type ChatService = ReturnType<typeof createChatService>;
