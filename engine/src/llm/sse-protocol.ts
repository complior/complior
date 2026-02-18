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
