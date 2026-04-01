export interface SseEventPayload {
  event: string;
  data: string;
}

export const sseThinking = (content: string): SseEventPayload => ({
  event: 'thinking',
  data: JSON.stringify({ content }),
});

export const sseText = (content: string): SseEventPayload => ({
  event: 'text',
  data: JSON.stringify({ content }),
});

export const sseToolCall = (toolCallId: string, toolName: string, args: object): SseEventPayload => ({
  event: 'tool_call',
  data: JSON.stringify({ toolCallId, toolName, args }),
});

export const sseToolResult = (toolCallId: string, toolName: string, result: string, isError: boolean): SseEventPayload => ({
  event: 'tool_result',
  data: JSON.stringify({ toolCallId, toolName, result, isError }),
});

export const sseUsage = (promptTokens: number, completionTokens: number): SseEventPayload => ({
  event: 'usage',
  data: JSON.stringify({ promptTokens, completionTokens }),
});

export const sseDone = (): SseEventPayload => ({
  event: 'done',
  data: '{}',
});

export const sseError = (message: string): SseEventPayload => ({
  event: 'error',
  data: JSON.stringify({ message }),
});

// ── Eval SSE events ──────────────────────────────────────────────

export const sseEvalStart = (target: string, model: string | undefined, mode: string, judgeModel?: string): SseEventPayload => ({
  event: 'eval:start',
  data: JSON.stringify({ target, model: model ?? 'default', mode, ...(judgeModel ? { judgeModel } : {}) }),
});

export const sseEvalHealth = (ok: boolean): SseEventPayload => ({
  event: 'eval:health',
  data: JSON.stringify({ ok }),
});

export const sseEvalTest = (payload: {
  testId: string;
  name: string;
  category: string;
  method: string;
  verdict: string;
  score: number;
  latencyMs: number;
  phase: string;
  completed: number;
  total: number;
  owaspCategory?: string;
  severity?: string;
  probe?: string;
  response?: string;
  reasoning?: string;
}): SseEventPayload => ({
  event: 'eval:test',
  data: JSON.stringify(payload),
});

export const sseEvalDone = (result: unknown): SseEventPayload => ({
  event: 'eval:done',
  data: JSON.stringify(result),
});
