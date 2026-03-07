/** Extract text from OpenAI/Anthropic response formats using type narrowing (no `as` assertions) */
export const extractResponseText = (response: unknown): string => {
  if (typeof response === 'string') return response;
  if (!response || typeof response !== 'object') return '';

  // OpenAI format: { choices: [{ message: { content: string } }] }
  if ('choices' in response) {
    const choices = response.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const first: unknown = choices[0];
      if (first && typeof first === 'object' && 'message' in first) {
        const msg: unknown = first.message;
        if (msg && typeof msg === 'object' && 'content' in msg && typeof msg.content === 'string') {
          return msg.content;
        }
      }
    }
  }

  // Anthropic format: { content: [{ text: string }] }
  if ('content' in response) {
    const content = response.content;
    if (Array.isArray(content) && content.length > 0) {
      const first: unknown = content[0];
      if (first && typeof first === 'object' && 'text' in first && typeof first.text === 'string') {
        return first.text;
      }
    }
  }

  return '';
};
