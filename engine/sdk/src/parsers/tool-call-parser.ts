/**
 * Unified tool_calls parser for OpenAI, Anthropic, and Google Gemini response formats.
 * US-S05-03: Extracts tool invocations from LLM responses regardless of provider.
 */

export interface ParsedToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
  readonly provider: 'openai' | 'anthropic' | 'google' | 'unknown';
}

// --- OpenAI format ---
// response.choices[].message.tool_calls[]: { id, type, function: { name, arguments } }

interface OpenAIToolCall {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface OpenAIChoice {
  message?: {
    tool_calls?: OpenAIToolCall[];
  };
}

const parseOpenAI = (response: Record<string, unknown>): ParsedToolCall[] => {
  const choices = response['choices'] as OpenAIChoice[] | undefined;
  if (!Array.isArray(choices)) return [];

  const results: ParsedToolCall[] = [];
  for (const choice of choices) {
    const toolCalls = choice?.message?.tool_calls;
    if (!Array.isArray(toolCalls)) continue;

    for (const tc of toolCalls) {
      if (!tc?.function?.name) continue;
      let args: Record<string, unknown> = {};
      if (typeof tc.function.arguments === 'string') {
        try {
          args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch {
          args = { _raw: tc.function.arguments };
        }
      }
      results.push({
        id: tc.id ?? `openai-${results.length}`,
        name: tc.function.name,
        arguments: args,
        provider: 'openai',
      });
    }
  }
  return results;
};

// --- Anthropic format ---
// response.content[]: { type: 'tool_use', id, name, input }

interface AnthropicContentBlock {
  type?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

const parseAnthropic = (response: Record<string, unknown>): ParsedToolCall[] => {
  const content = response['content'] as AnthropicContentBlock[] | undefined;
  if (!Array.isArray(content)) return [];

  const results: ParsedToolCall[] = [];
  for (const block of content) {
    if (block?.type !== 'tool_use' || !block.name) continue;
    results.push({
      id: block.id ?? `anthropic-${results.length}`,
      name: block.name,
      arguments: block.input ?? {},
      provider: 'anthropic',
    });
  }
  return results;
};

// --- Google Gemini format ---
// response.candidates[].content.parts[]: { functionCall: { name, args } }

interface GeminiPart {
  functionCall?: {
    name?: string;
    args?: Record<string, unknown>;
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

const parseGoogle = (response: Record<string, unknown>): ParsedToolCall[] => {
  const candidates = response['candidates'] as GeminiCandidate[] | undefined;
  if (!Array.isArray(candidates)) return [];

  const results: ParsedToolCall[] = [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      const fc = part?.functionCall;
      if (!fc?.name) continue;
      results.push({
        id: `google-${results.length}`,
        name: fc.name,
        arguments: fc.args ?? {},
        provider: 'google',
      });
    }
  }
  return results;
};

/**
 * Parse tool_calls from any LLM provider response.
 * Tries all three formats and returns combined results.
 */
export const parseToolCalls = (response: unknown): ParsedToolCall[] => {
  if (!response || typeof response !== 'object') return [];
  const resp = response as Record<string, unknown>;

  // Try each provider format — they don't overlap, so we can try all
  const openai = parseOpenAI(resp);
  if (openai.length > 0) return openai;

  const anthropic = parseAnthropic(resp);
  if (anthropic.length > 0) return anthropic;

  const google = parseGoogle(resp);
  if (google.length > 0) return google;

  return [];
};
