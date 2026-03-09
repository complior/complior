/** Pure utility — extracts model + usage from multi-provider LLM responses */

export interface ResponseMeta {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

/** Extract a numeric value from an object by checking multiple possible keys */
export const getNumericField = (obj: object, ...keys: string[]): number => {
  for (const key of keys) {
    if (key in obj) {
      const val: unknown = (obj as Record<string, unknown>)[key];
      if (typeof val === 'number') return val;
    }
  }
  return 0;
};

/** Extract model identifier from OpenAI/Anthropic response */
export const extractModel = (response: unknown): string => {
  if (!response || typeof response !== 'object') return 'unknown';
  if ('model' in response && typeof response.model === 'string') return response.model;
  return 'unknown';
};

/** Extract model, input/output tokens from multi-provider LLM response */
export const extractResponseMeta = (response: unknown): ResponseMeta => {
  const model = extractModel(response);
  if (!response || typeof response !== 'object' || !('usage' in response)) {
    return { model, inputTokens: 0, outputTokens: 0 };
  }

  const usage: unknown = response.usage;
  if (!usage || typeof usage !== 'object') {
    return { model, inputTokens: 0, outputTokens: 0 };
  }

  return {
    model,
    inputTokens: getNumericField(usage, 'prompt_tokens', 'promptTokens', 'input_tokens'),
    outputTokens: getNumericField(usage, 'completion_tokens', 'completionTokens', 'output_tokens'),
  };
};
