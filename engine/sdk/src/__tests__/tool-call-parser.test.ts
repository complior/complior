import { describe, it, expect } from 'vitest';
import { parseToolCalls } from '../parsers/tool-call-parser.js';

describe('parseToolCalls', () => {
  // ── OpenAI format ──────────────────────────────────────────────

  describe('OpenAI format', () => {
    it('parses single tool_call from choices[].message.tool_calls[]', () => {
      const response = {
        choices: [{
          message: {
            tool_calls: [{
              id: 'call_abc123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"location":"Berlin"}',
              },
            }],
          },
        }],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('call_abc123');
      expect(result[0]!.name).toBe('get_weather');
      expect(result[0]!.arguments).toEqual({ location: 'Berlin' });
      expect(result[0]!.provider).toBe('openai');
    });

    it('parses multiple tool_calls in single choice', () => {
      const response = {
        choices: [{
          message: {
            tool_calls: [
              { id: 'call_1', type: 'function', function: { name: 'search', arguments: '{"q":"AI Act"}' } },
              { id: 'call_2', type: 'function', function: { name: 'read_file', arguments: '{"path":"/tmp/x"}' } },
              { id: 'call_3', type: 'function', function: { name: 'write_file', arguments: '{}' } },
            ],
          },
        }],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.name)).toEqual(['search', 'read_file', 'write_file']);
    });

    it('handles malformed JSON in arguments gracefully', () => {
      const response = {
        choices: [{
          message: {
            tool_calls: [{
              id: 'call_bad',
              type: 'function',
              function: { name: 'do_thing', arguments: '{not valid json}' },
            }],
          },
        }],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('do_thing');
      expect(result[0]!.arguments).toEqual({ _raw: '{not valid json}' });
    });

    it('skips entries without function name', () => {
      const response = {
        choices: [{
          message: {
            tool_calls: [
              { id: 'call_1', function: { name: 'valid_tool', arguments: '{}' } },
              { id: 'call_2', function: {} },
              { id: 'call_3' },
            ],
          },
        }],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('valid_tool');
    });
  });

  // ── Anthropic format ───────────────────────────────────────────

  describe('Anthropic format', () => {
    it('parses tool_use content blocks', () => {
      const response = {
        content: [
          { type: 'text', text: 'Let me check the weather.' },
          {
            type: 'tool_use',
            id: 'toolu_abc123',
            name: 'get_weather',
            input: { location: 'Paris' },
          },
        ],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('toolu_abc123');
      expect(result[0]!.name).toBe('get_weather');
      expect(result[0]!.arguments).toEqual({ location: 'Paris' });
      expect(result[0]!.provider).toBe('anthropic');
    });

    it('parses multiple tool_use blocks', () => {
      const response = {
        content: [
          { type: 'tool_use', id: 'toolu_1', name: 'search_db', input: { query: 'AI' } },
          { type: 'text', text: 'Found results.' },
          { type: 'tool_use', id: 'toolu_2', name: 'format_output', input: {} },
        ],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('search_db');
      expect(result[1]!.name).toBe('format_output');
    });

    it('ignores non-tool_use content blocks', () => {
      const response = {
        content: [
          { type: 'text', text: 'Just a text response.' },
        ],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(0);
    });
  });

  // ── Google Gemini format ───────────────────────────────────────

  describe('Google Gemini format', () => {
    it('parses functionCall from candidates[].content.parts[]', () => {
      const response = {
        candidates: [{
          content: {
            parts: [{
              functionCall: {
                name: 'get_stock_price',
                args: { ticker: 'GOOG' },
              },
            }],
          },
        }],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('get_stock_price');
      expect(result[0]!.arguments).toEqual({ ticker: 'GOOG' });
      expect(result[0]!.provider).toBe('google');
    });

    it('parses multiple functionCalls across parts', () => {
      const response = {
        candidates: [{
          content: {
            parts: [
              { functionCall: { name: 'tool_a', args: { x: 1 } } },
              { functionCall: { name: 'tool_b', args: { y: 2 } } },
            ],
          },
        }],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('tool_a');
      expect(result[1]!.name).toBe('tool_b');
    });

    it('handles missing args gracefully', () => {
      const response = {
        candidates: [{
          content: {
            parts: [{
              functionCall: { name: 'no_args_tool' },
            }],
          },
        }],
      };

      const result = parseToolCalls(response);
      expect(result).toHaveLength(1);
      expect(result[0]!.arguments).toEqual({});
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty array for null response', () => {
      expect(parseToolCalls(null)).toEqual([]);
    });

    it('returns empty array for undefined response', () => {
      expect(parseToolCalls(undefined)).toEqual([]);
    });

    it('returns empty array for string response', () => {
      expect(parseToolCalls('just text')).toEqual([]);
    });

    it('returns empty array for number response', () => {
      expect(parseToolCalls(42)).toEqual([]);
    });

    it('returns empty array for response with no tool_calls', () => {
      const response = {
        choices: [{ message: { content: 'Hello!' } }],
      };
      expect(parseToolCalls(response)).toEqual([]);
    });

    it('returns empty array for empty choices array', () => {
      expect(parseToolCalls({ choices: [] })).toEqual([]);
    });
  });
});
