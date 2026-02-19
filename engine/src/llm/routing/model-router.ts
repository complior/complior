export type TaskType = 'qa' | 'scan_fix' | 'code_gen' | 'report' | 'whatif' | 'deep_analysis';

export interface ModelSelection {
  readonly model: string;
  readonly provider: string;
  readonly taskType: TaskType;
  readonly reason: string;
}

// Default routing table
const ROUTE_TABLE: Record<TaskType, ModelSelection> = {
  qa: { model: 'claude-haiku-4', provider: 'anthropic', taskType: 'qa', reason: 'Fast and cheap for Q&A' },
  scan_fix: { model: 'claude-haiku-4', provider: 'anthropic', taskType: 'scan_fix', reason: 'Tool calls don\'t require reasoning' },
  code_gen: { model: 'claude-sonnet-4', provider: 'anthropic', taskType: 'code_gen', reason: 'Balance of quality and cost' },
  report: { model: 'claude-opus-4', provider: 'anthropic', taskType: 'report', reason: 'Deep analysis and structuring' },
  whatif: { model: 'claude-sonnet-4', provider: 'anthropic', taskType: 'whatif', reason: 'Medium complexity reasoning' },
  deep_analysis: { model: 'claude-sonnet-4', provider: 'anthropic', taskType: 'deep_analysis', reason: 'Code snippet analysis' },
};

const REPORT_KEYWORDS = ['report', 'отчёт', 'отчет', 'generate report', 'full analysis'];
const CODE_KEYWORDS = ['create', 'edit', 'write', 'implement', 'fix', 'refactor', 'add'];
const SCAN_KEYWORDS = ['scan', 'check', 'compliance', 'score', 'violations'];

export const determineTaskType = (
  userMessage: string,
  requestedTools: readonly string[],
): TaskType => {
  if (requestedTools.includes('generateReport')) return 'report';
  if (requestedTools.some((t) => ['createFile', 'editFile', 'applyDiff'].includes(t))) return 'code_gen';
  if (requestedTools.some((t) => ['scanProject', 'fixIssue'].includes(t))) return 'scan_fix';
  if (requestedTools.includes('whatIfScenario')) return 'whatif';

  const msg = userMessage.toLowerCase();
  if (REPORT_KEYWORDS.some((k) => msg.includes(k))) return 'report';
  if (CODE_KEYWORDS.some((k) => msg.includes(k))) return 'code_gen';
  if (SCAN_KEYWORDS.some((k) => msg.includes(k))) return 'scan_fix';

  return 'qa';
};

export const routeModel = (
  taskType: TaskType,
  override?: string,
): ModelSelection => {
  if (override) {
    return {
      model: override,
      provider: override.startsWith('gpt') ? 'openai' : override.startsWith('gemini') ? 'google' : 'anthropic',
      taskType,
      reason: `Manually selected: ${override}`,
    };
  }
  return ROUTE_TABLE[taskType];
};
