/** Shared types and utilities for pre-hooks that process LLM message arrays */

export interface LLMMessage {
  readonly role: string;
  readonly content: string;
}

/** Runtime type guard for LLM messages array (boundary validation) */
export const isLLMMessageArray = (val: unknown): val is readonly LLMMessage[] => {
  if (!Array.isArray(val)) return false;
  if (val.length === 0) return true;
  const first: unknown = val[0];
  if (!first || typeof first !== 'object') return false;
  return 'role' in first && 'content' in first && typeof first.role === 'string';
};

/** Extract concatenated text from messages params */
export const extractMessageText = (params: Record<string, unknown>): string => {
  const val = params['messages'];
  if (!isLLMMessageArray(val)) return '';
  return val.map((m) => m.content).join(' ');
};
