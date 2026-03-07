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

const safeParseJSON = (str: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(str);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>; // TS limitation: object → Record for JSON.parse
    }
    return { _raw: str };
  } catch {
    return { _raw: str };
  }
};

// --- OpenAI format ---
// response.choices[].message.tool_calls[]: { id, type, function: { name, arguments } }

const parseOpenAI = (response: Record<string, unknown>): ParsedToolCall[] => {
  const choicesVal = response['choices'];
  if (!Array.isArray(choicesVal)) return [];

  const results: ParsedToolCall[] = [];
  for (const choiceRaw of choicesVal) {
    const choice: unknown = choiceRaw;
    if (!choice || typeof choice !== 'object' || !('message' in choice)) continue;

    const message: unknown = choice.message;
    if (!message || typeof message !== 'object' || !('tool_calls' in message)) continue;
    if (!Array.isArray(message.tool_calls)) continue;

    for (const tcRaw of message.tool_calls) {
      const tc: unknown = tcRaw;
      if (!tc || typeof tc !== 'object') continue;
      if (!('function' in tc) || !tc.function || typeof tc.function !== 'object') continue;
      if (!('name' in tc.function) || typeof tc.function.name !== 'string') continue;

      const fnArgs = 'arguments' in tc.function && typeof tc.function.arguments === 'string'
        ? tc.function.arguments
        : undefined;
      const args = fnArgs ? safeParseJSON(fnArgs) : {};
      const id = 'id' in tc && typeof tc.id === 'string' ? tc.id : `openai-${results.length}`;

      results.push({ id, name: tc.function.name, arguments: args, provider: 'openai' });
    }
  }
  return results;
};

// --- Anthropic format ---
// response.content[]: { type: 'tool_use', id, name, input }

const parseAnthropic = (response: Record<string, unknown>): ParsedToolCall[] => {
  const contentVal = response['content'];
  if (!Array.isArray(contentVal)) return [];

  const results: ParsedToolCall[] = [];
  for (const blockRaw of contentVal) {
    const block: unknown = blockRaw;
    if (!block || typeof block !== 'object') continue;
    if (!('type' in block) || block.type !== 'tool_use') continue;
    if (!('name' in block) || typeof block.name !== 'string') continue;

    const id = 'id' in block && typeof block.id === 'string' ? block.id : `anthropic-${results.length}`;
    const input = 'input' in block && block.input && typeof block.input === 'object' && !Array.isArray(block.input)
      ? block.input as Record<string, unknown> // TS limitation: object → Record
      : {};

    results.push({ id, name: block.name, arguments: input, provider: 'anthropic' });
  }
  return results;
};

// --- Google Gemini format ---
// response.candidates[].content.parts[]: { functionCall: { name, args } }

const parseGoogle = (response: Record<string, unknown>): ParsedToolCall[] => {
  const candidatesVal = response['candidates'];
  if (!Array.isArray(candidatesVal)) return [];

  const results: ParsedToolCall[] = [];
  for (const candRaw of candidatesVal) {
    const candidate: unknown = candRaw;
    if (!candidate || typeof candidate !== 'object' || !('content' in candidate)) continue;

    const content: unknown = candidate.content;
    if (!content || typeof content !== 'object' || !('parts' in content)) continue;
    if (!Array.isArray(content.parts)) continue;

    for (const partRaw of content.parts) {
      const part: unknown = partRaw;
      if (!part || typeof part !== 'object' || !('functionCall' in part)) continue;

      const fc: unknown = part.functionCall;
      if (!fc || typeof fc !== 'object') continue;
      if (!('name' in fc) || typeof fc.name !== 'string') continue;

      const args = 'args' in fc && fc.args && typeof fc.args === 'object' && !Array.isArray(fc.args)
        ? fc.args as Record<string, unknown> // TS limitation: object → Record
        : {};

      results.push({
        id: `google-${results.length}`,
        name: fc.name,
        arguments: args,
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

  // Use 'in' narrowing to build a Record-like accessor
  const resp: Record<string, unknown> = Object.fromEntries(Object.entries(response));

  // Try each provider format — they don't overlap, so we can try all
  const openai = parseOpenAI(resp);
  if (openai.length > 0) return openai;

  const anthropic = parseAnthropic(resp);
  if (anthropic.length > 0) return anthropic;

  const google = parseGoogle(resp);
  if (google.length > 0) return google;

  return [];
};
